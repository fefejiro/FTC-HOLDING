import argparse
import json
import time
from pathlib import Path

import pyperclip
from pywinauto import Desktop, keyboard, mouse


class VisibleBrowserLock:
    def __init__(self, timeout_seconds: float = 180.0):
        self.path = Path(".local/visible-browser.lock")
        self.timeout_seconds = timeout_seconds
        self.acquired = False

    def __enter__(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        deadline = time.time() + self.timeout_seconds
        while time.time() < deadline:
            try:
                self.path.mkdir()
                self.acquired = True
                (self.path / "owner.txt").write_text(str(time.time()), encoding="utf-8")
                return self
            except FileExistsError:
                time.sleep(0.5)
        raise RuntimeError(f"Timed out waiting for visible Chrome lock: {self.path.resolve()}")

    def __exit__(self, exc_type, exc, tb):
        if not self.acquired:
            return
        try:
            for child in self.path.iterdir():
                child.unlink()
            self.path.rmdir()
        except Exception:
            pass


def profile_label(window) -> str:
    try:
        for button in window.descendants(control_type="Button"):
            try:
                text = button.window_text() or ""
                props = button.get_properties()
                automation_id = props.get("automation_id") or ""
            except Exception:
                continue
            if automation_id == "view_1018" and text:
                return text.strip()
    except Exception:
        return ""
    return ""


def is_fejiro_profile(window) -> bool:
    label = profile_label(window).lower()
    return "fejiro" in label and "mike" not in label and "michael" not in label


def find_chrome_window():
    candidates = []
    for window in Desktop(backend="uia").windows():
        try:
            title = window.window_text()
            class_name = window.class_name()
        except Exception:
            continue
        if class_name == "Chrome_WidgetWin_1" and title and "Google Chrome" in title:
            candidates.append(window)

    if not candidates:
        raise RuntimeError("No visible Google Chrome window found.")

    fejiro_windows = [window for window in candidates if is_fejiro_profile(window)]
    if not fejiro_windows:
        seen = ", ".join(
            f"{window.window_text()} [profile={profile_label(window) or 'unknown'}]"
            for window in candidates
        )
        raise RuntimeError(f"No visible Fejiro Chrome profile window found. Seen: {seen}")

    candidates = fejiro_windows

    for window in candidates:
        title = window.window_text()
        if "Fejiro" in title or "Dice" in title or "Indeed" in title or "dice.com" in title or "indeed" in title.lower():
            return window

    return candidates[0]


def navigate_current_tab(window, url: str, wait_seconds: float) -> None:
    window.set_focus()
    time.sleep(0.4)
    pyperclip.copy(url)
    keyboard.send_keys("^l")
    time.sleep(0.2)
    keyboard.send_keys("^v")
    keyboard.send_keys("{ENTER}")
    time.sleep(wait_seconds)


def read_current_url(window) -> str:
    window.set_focus()
    time.sleep(0.2)
    previous_clipboard = pyperclip.paste()
    keyboard.send_keys("^l")
    time.sleep(0.2)
    keyboard.send_keys("^c")
    time.sleep(0.2)
    current_url = pyperclip.paste()
    keyboard.send_keys("{ESC}")
    time.sleep(0.1)
    pyperclip.copy(previous_clipboard)
    return current_url


def run_javascript_url(window, payload: str, wait_seconds: float) -> None:
    window.set_focus()
    time.sleep(0.3)
    keyboard.send_keys("^l")
    time.sleep(0.2)
    keyboard.send_keys("javascript:")
    pyperclip.copy(payload)
    keyboard.send_keys("^v")
    keyboard.send_keys("{ENTER}")
    time.sleep(wait_seconds)


def click_apply_control(window, wait_seconds: float) -> None:
    payload = r"""(() => {
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const candidates = [...document.querySelectorAll('button,a,input[type="button"],input[type="submit"],[role="button"]')];
  const target = candidates.find((el) => {
    const text = clean(el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || '');
    return /^(apply with indeed|apply now|continue to apply|apply)$/i.test(text) || /apply with indeed|indeed apply/i.test(text);
  });
  if (!target) {
    document.documentElement.setAttribute('data-job-agent-click-apply', 'not-found');
    return;
  }
  target.scrollIntoView({ block: 'center', inline: 'center' });
  target.click();
  document.documentElement.setAttribute('data-job-agent-click-apply', 'clicked');
})()"""
    run_javascript_url(window, payload, wait_seconds)
    if "Apply with Indeed" in visible_text(window):
        click_visible_text(window, "Apply with Indeed")
        time.sleep(wait_seconds)


def click_text_control(window, text_pattern: str, wait_seconds: float) -> None:
    pattern_json = json.dumps(text_pattern)
    payload = r"""(() => {
  const pattern = new RegExp(""" + pattern_json + r""", 'i');
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const candidates = [...document.querySelectorAll('button,a,input[type="button"],input[type="submit"],[role="button"]')];
  const target = candidates.find((el) => {
    const text = clean(el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || '');
    return pattern.test(text);
  });
  if (!target) {
    document.documentElement.setAttribute('data-job-agent-click-text', 'not-found');
    return;
  }
  target.scrollIntoView({ block: 'center', inline: 'center' });
  target.click();
  document.documentElement.setAttribute('data-job-agent-click-text', 'clicked');
})()"""
    run_javascript_url(window, payload, wait_seconds)


def visible_text(window) -> str:
    parts = []
    try:
        for control in window.descendants():
            try:
                text = (control.window_text() or "").strip()
            except Exception:
                continue
            if text:
                parts.append(text)
    except Exception:
        pass
    return "\n".join(parts)


def click_visible_button(window, label: str, scroll_attempts: int = 0) -> bool:
    for attempt in range(scroll_attempts + 1):
        window_rect = window.rectangle()
        for button in window.descendants(control_type="Button"):
            try:
                text = (button.window_text() or "").strip()
                rect = button.rectangle()
            except Exception:
                continue
            if text == label:
                if rect.bottom <= window_rect.top or rect.top >= window_rect.bottom or rect.right <= window_rect.left or rect.left >= window_rect.right:
                    continue
                try:
                    button.click_input()
                    return True
                except Exception:
                    pass
        if attempt < scroll_attempts:
            scroll_x = max(window_rect.left + 50, min(window_rect.right - 50, window_rect.mid_point().x))
            scroll_y = max(window_rect.top + 120, min(window_rect.bottom - 80, window_rect.mid_point().y))
            mouse.scroll(coords=(scroll_x, scroll_y), wheel_dist=-5)
            time.sleep(0.6)
    return False


def click_visible_text(window, label: str) -> bool:
    window_rect = window.rectangle()
    for control in window.descendants():
        try:
            text = (control.window_text() or "").strip()
            rect = control.rectangle()
        except Exception:
            continue
        if text == label:
            if rect.bottom <= window_rect.top or rect.top >= window_rect.bottom or rect.right <= window_rect.left or rect.left >= window_rect.right:
                continue
            try:
                control.click_input()
                return True
            except Exception:
                pass
    return False


def upload_file_from_resume_options(window, file_path: str, wait_seconds: float) -> dict:
    file = Path(file_path)
    if not file.exists():
        return {"ok": False, "reason": f"Upload file not found: {file_path}"}

    before_handles = set()
    for candidate in Desktop(backend="uia").windows():
        try:
            before_handles.add(candidate.handle)
        except Exception:
            pass

    window.set_focus()
    time.sleep(0.4)
    scroll_and_click_resume_options = r"""(() => {
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const target = [...document.querySelectorAll('button,[role="button"],a')]
    .find((el) => /resume options/i.test(clean(el.innerText || el.textContent || el.getAttribute('aria-label') || '')));
  if (!target) {
    document.documentElement.setAttribute('data-job-agent-resume-options', 'not-found');
    return;
  }
  target.scrollIntoView({ block: 'center', inline: 'center' });
  target.focus();
  target.click();
  document.documentElement.setAttribute('data-job-agent-resume-options', 'clicked');
})()"""
    run_javascript_url(window, scroll_and_click_resume_options, 0.8)
    if "Upload a different file" not in visible_text(window):
        window.set_focus()
        time.sleep(0.2)
        keyboard.send_keys("{ENTER}")
        time.sleep(0.6)
    if "Upload a different file" not in visible_text(window):
        window.set_focus()
        time.sleep(0.2)
        keyboard.send_keys("{SPACE}")
        time.sleep(0.6)
    if not click_visible_button(window, "Resume options", scroll_attempts=3):
        if "Upload a different file" not in visible_text(window):
            return {"ok": False, "reason": "Resume options button was not found or could not be clicked."}
    else:
        time.sleep(0.8)

    if not click_visible_text(window, "Upload a different file"):
        click_upload = r"""(() => {
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const target = [...document.querySelectorAll('button,[role="button"],li,[role="menuitem"],div')]
    .find((el) => clean(el.innerText || el.textContent || el.getAttribute('aria-label') || '') === 'Upload a different file');
  if (!target) {
    document.documentElement.setAttribute('data-job-agent-upload-different', 'not-found');
    return;
  }
  target.scrollIntoView({ block: 'center', inline: 'center' });
  target.focus();
  target.click();
  document.documentElement.setAttribute('data-job-agent-upload-different', 'clicked');
})()"""
        run_javascript_url(window, click_upload, 0.8)

    picker = None
    picker_title = ""
    deadline = time.time() + 15
    while time.time() < deadline:
        time.sleep(0.5)
        for candidate in Desktop(backend="uia").windows():
            try:
                if candidate.handle in before_handles:
                    continue
                title = candidate.window_text() or ""
                class_name = candidate.class_name() or ""
            except Exception:
                continue
            lowered = title.lower()
            if class_name in ("#32770", "CabinetWClass") or "open" in lowered or "choose" in lowered or "upload" in lowered:
                picker = candidate
                picker_title = title
                break
        if picker:
            break

    if not picker:
        return {"ok": False, "reason": "Upload file picker did not open."}

    picker.set_focus()
    time.sleep(0.3)
    previous_clipboard = pyperclip.paste()
    pyperclip.copy(str(file.resolve()))
    try:
        keyboard.send_keys("%n")
        time.sleep(0.2)
        keyboard.send_keys("^a")
        time.sleep(0.1)
        keyboard.send_keys("^v")
        time.sleep(0.2)
        keyboard.send_keys("{ENTER}")
    finally:
        time.sleep(0.2)
        pyperclip.copy(previous_clipboard)

    time.sleep(wait_seconds)
    page_text = visible_text(window)
    basename = file.name
    if basename.lower() in page_text.lower():
        return {"ok": True, "reason": f"Uploaded resume file is visible on the page: {basename}", "pickerTitle": picker_title}
    return {
        "ok": False,
        "reason": f"Upload attempted, but generated filename is not visible on the page: {basename}",
        "pickerTitle": picker_title,
    }


def find_new_file_picker(before_handles: set[int], timeout_seconds: float = 15.0):
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        time.sleep(0.5)
        for candidate in Desktop(backend="uia").windows():
            try:
                if candidate.handle in before_handles:
                    continue
                title = candidate.window_text() or ""
                class_name = candidate.class_name() or ""
            except Exception:
                continue
            lowered = title.lower()
            if class_name in ("#32770", "CabinetWClass") or "open" in lowered or "choose" in lowered or "upload" in lowered:
                return candidate, title
    return None, ""


def fill_file_picker(picker, file_path: Path) -> None:
    picker.set_focus()
    time.sleep(0.3)
    previous_clipboard = pyperclip.paste()
    pyperclip.copy(str(file_path.resolve()))
    try:
        keyboard.send_keys("%n")
        time.sleep(0.2)
        keyboard.send_keys("^a")
        time.sleep(0.1)
        keyboard.send_keys("^v")
        time.sleep(0.2)
        keyboard.send_keys("{ENTER}")
    finally:
        time.sleep(0.2)
        pyperclip.copy(previous_clipboard)


def upload_supporting_document(window, file_path: str, wait_seconds: float) -> dict:
    file = Path(file_path)
    if not file.exists():
        return {"ok": False, "reason": f"Supporting document not found: {file_path}"}

    before_handles = set()
    for candidate in Desktop(backend="uia").windows():
        try:
            before_handles.add(candidate.handle)
        except Exception:
            pass

    window.set_focus()
    time.sleep(0.4)
    click_add_near_supporting_docs = r"""(() => {
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const buttons = [...document.querySelectorAll('button,[role="button"],a')];
  const addButtons = buttons.filter((el) => /^add$/i.test(clean(el.innerText || el.textContent || el.getAttribute('aria-label') || '')));
  if (!addButtons.length) {
    document.documentElement.setAttribute('data-job-agent-supporting-add', 'not-found');
    return;
  }
  const target = addButtons[0];
  target.scrollIntoView({ block: 'center', inline: 'center' });
  target.focus();
  target.click();
  document.documentElement.setAttribute('data-job-agent-supporting-add', 'clicked');
})()"""
    run_javascript_url(window, click_add_near_supporting_docs, 1.0)
    time.sleep(1.0)
    if "No cover letter or additional documents added" in visible_text(window):
        click_visible_button(window, "Add", scroll_attempts=4)

    time.sleep(1.0)
    picker, picker_title = find_new_file_picker(before_handles, timeout_seconds=3.0)
    if not picker:
        for label in ("Upload a file", "Upload file", "Add file", "Choose file"):
            if click_visible_text(window, label):
                break
        picker, picker_title = find_new_file_picker(before_handles, timeout_seconds=12.0)

    if not picker:
        return {"ok": False, "reason": "Supporting document file picker did not open."}

    fill_file_picker(picker, file)
    time.sleep(wait_seconds)
    page_text = visible_text(window)
    basename = file.name
    if basename.lower() in page_text.lower() or "cover" in page_text.lower():
        return {"ok": True, "reason": f"Supporting document upload appears visible: {basename}", "pickerTitle": picker_title}
    return {
        "ok": False,
        "reason": f"Supporting document upload attempted, but filename is not visible on the page: {basename}",
        "pickerTitle": picker_title,
    }


def run_dom_dump(window, wait_seconds: float) -> dict:
    # Chrome strips pasted javascript: URLs. Type the prefix, paste the payload.
    payload = r"""(() => {
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const links = [...document.querySelectorAll('a[href]')].map((a) => ({
    text: clean(a.innerText || a.textContent || a.getAttribute('aria-label') || ''),
    href: a.href || ''
  })).filter((item) => item.text || item.href).slice(0, 500);
  const controls = [...document.querySelectorAll('button,a,input[type="button"],input[type="submit"],[role="button"],[role="menuitem"]')].map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      text: clean(el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || ''),
      tag: el.tagName,
      role: el.getAttribute('role') || '',
      type: el.getAttribute('type') || '',
      disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'),
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
    };
  }).filter((item) => item.text || item.role || item.type).slice(0, 500);
  const cards = [...document.querySelectorAll('[data-jk], li, div')].map((el) => {
    const text = clean(el.innerText || el.textContent || '');
    const link = el.querySelector && el.querySelector('a[href]');
    return { text, href: link ? link.href : '' };
  }).filter((item) => item.text.length > 40 && /job|apply|remote|manager|analyst|program|systems|architect|indeed/i.test(item.text)).slice(0, 300);
  const data = {
    capturedAt: new Date().toISOString(),
    url: location.href,
    title: document.title,
    text: clean(document.body.innerText || '').slice(0, 20000),
    links,
    controls,
    cards
  };
  document.documentElement.innerHTML = '<head><title>Job Agent DOM Dump</title></head><body><pre id="job-agent-dump" style="white-space:pre-wrap;font:12px monospace;"></pre></body>';
  document.getElementById('job-agent-dump').innerText = JSON.stringify(data, null, 2);
})()"""

    window.set_focus()
    time.sleep(0.3)
    keyboard.send_keys("^l")
    time.sleep(0.2)
    keyboard.send_keys("javascript:")
    pyperclip.copy(payload)
    keyboard.send_keys("^v")
    keyboard.send_keys("{ENTER}")
    time.sleep(wait_seconds)
    keyboard.send_keys("^a")
    time.sleep(0.2)
    keyboard.send_keys("^c")
    time.sleep(0.5)
    copied = pyperclip.paste()
    start = copied.find("{")
    end = copied.rfind("}")
    if start < 0 or end <= start:
        raise RuntimeError("Could not copy JSON DOM dump from visible Chrome tab.")
    return json.loads(copied[start : end + 1])


def main() -> int:
    parser = argparse.ArgumentParser(description="Dump DOM data from the already-open visible Fejiro Chrome window.")
    parser.add_argument("--url", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--screenshot")
    parser.add_argument("--wait", type=float, default=8.0)
    parser.add_argument("--dump-wait", type=float, default=1.5)
    parser.add_argument("--click-apply", action="store_true", help="Click a visible Apply/Apply with Indeed control before capture.")
    parser.add_argument("--click-text", help="Click a visible button/link whose text matches this regex before capture.")
    parser.add_argument("--click-wait", type=float, default=5.0)
    parser.add_argument("--upload-file", help="Use Resume options -> Upload a different file, then upload this file path.")
    parser.add_argument("--upload-supporting-file", help="Use Supporting documents -> Add, then upload this file path.")
    parser.add_argument("--upload-wait", type=float, default=8.0)
    parser.add_argument("--leave-dump-page", action="store_true", help="Leave the tab on the copied JSON dump page instead of restoring the captured URL.")
    parser.add_argument("--no-dump", action="store_true", help="Navigate/click/screenshot only; do not replace the page with a DOM dump.")
    args = parser.parse_args()

    with VisibleBrowserLock():
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        window = find_chrome_window()
        before_title = window.window_text()
        navigate_current_tab(window, args.url, args.wait)
        if args.click_apply:
            click_apply_control(window, args.click_wait)
        if args.click_text:
            click_text_control(window, args.click_text, args.click_wait)
        upload_result = None
        if args.upload_file:
            upload_result = upload_file_from_resume_options(window, args.upload_file, args.upload_wait)
        supporting_upload_result = None
        if args.upload_supporting_file:
            supporting_upload_result = upload_supporting_document(window, args.upload_supporting_file, args.upload_wait)
        after_title = window.window_text()
        if args.screenshot:
            screenshot_path = Path(args.screenshot)
            screenshot_path.parent.mkdir(parents=True, exist_ok=True)
            window.capture_as_image().save(screenshot_path)
        if args.no_dump:
            final_url = read_current_url(window)
            data = {
                "capturedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "requestedUrl": args.url,
                "finalUrl": final_url,
                "visibleChromeTitleBefore": before_title,
                "visibleChromeTitleAfterNavigation": after_title,
            }
            if args.screenshot:
                data["screenshotPath"] = str(Path(args.screenshot).resolve())
            if upload_result is not None:
                data["uploadResult"] = upload_result
            if supporting_upload_result is not None:
                data["supportingUploadResult"] = supporting_upload_result
            out.write_text(json.dumps(data, indent=2), encoding="utf-8")
            print(f"Wrote visible Chrome action capture: {out.resolve()}")
            print(f"Visible Chrome title before: {before_title}")
            print(f"Visible Chrome title after navigation: {after_title}")
            return 0
        data = run_dom_dump(window, args.dump_wait)
        data["visibleChromeTitleBefore"] = before_title
        data["visibleChromeTitleAfterNavigation"] = after_title
        if args.screenshot:
            data["screenshotPath"] = str(Path(args.screenshot).resolve())
        if upload_result is not None:
            data["uploadResult"] = upload_result
        if supporting_upload_result is not None:
            data["supportingUploadResult"] = supporting_upload_result
        out.write_text(json.dumps(data, indent=2), encoding="utf-8")
        if not args.leave_dump_page and data.get("url"):
            navigate_current_tab(window, "about:blank", 0.5)
            navigate_current_tab(window, data["url"], 1.5)
        print(f"Wrote DOM dump: {out.resolve()}")
        print(f"Visible Chrome title before: {before_title}")
        print(f"Visible Chrome title after navigation: {after_title}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
