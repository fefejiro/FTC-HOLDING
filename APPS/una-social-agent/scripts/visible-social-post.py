import argparse
import ctypes
import hashlib
import json
import os
import time
from pathlib import Path

import pyperclip
from pywinauto import Desktop, keyboard, mouse


ROOT = Path(__file__).resolve().parents[1]


class VisibleBrowserLock:
    def __init__(self, timeout_seconds: float = 180.0):
        self.path = ROOT / ".local" / "visible-browser.lock"
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


def today_eastern() -> str:
    # Local machine is already on Eastern for this workflow.
    return time.strftime("%Y-%m-%d")


def draft_key(run_date: str, slot: str) -> str:
    return run_date if slot == "news" else f"{run_date}-{slot}"


def load_publish_approval(draft_dir: Path) -> dict:
    approval_path = draft_dir / "publish-approved.json"
    if not approval_path.exists():
        return {}
    try:
        return json.loads(approval_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid publish approval file: {approval_path}") from exc


def assert_publish_approved(draft_dir: Path, dry_run: bool) -> dict:
    approval = load_publish_approval(draft_dir)
    if dry_run:
        return approval
    if os.environ.get("UNA_ALLOW_UNAPPROVED_POST") == "1":
        return approval
    approval_path = draft_dir / "publish-approved.json"
    if not approval_path.exists():
        raise RuntimeError(
            "Live publishing is blocked until the exact preview is approved. "
            f"Create {approval_path} with {{\"approved\": true}} after review, "
            "or set UNA_ALLOW_UNAPPROVED_POST=1 for an intentional override."
        )
    if approval.get("approved") is not True:
        raise RuntimeError(f"Publish approval file does not contain approved=true: {approval_path}")
    return approval


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


def primary_screen_size() -> tuple[int, int]:
    try:
        return int(ctypes.windll.user32.GetSystemMetrics(0)), int(ctypes.windll.user32.GetSystemMetrics(1))
    except Exception:
        return 1920, 1080


def rect_payload(rect) -> dict:
    return {
        "left": int(rect.left),
        "top": int(rect.top),
        "right": int(rect.right),
        "bottom": int(rect.bottom),
        "width": int(rect.width()),
        "height": int(rect.height()),
    }


def force_window_to_primary(window, width: int | None = None, height: int | None = None) -> bool:
    screen_width, screen_height = primary_screen_size()
    target_width = min(width or 1400, screen_width)
    target_height = min(height or 950, screen_height)
    try:
        ctypes.windll.user32.ShowWindow(int(window.handle), 9)  # SW_RESTORE
        ctypes.windll.user32.SetWindowPos(
            int(window.handle),
            0,
            0,
            0,
            int(target_width),
            int(target_height),
            0x0040,  # SWP_SHOWWINDOW
        )
        time.sleep(0.8)
        return True
    except Exception:
        return False


def ensure_window_visible(window):
    """Keep visible-browser coordinate clicks inside the primary display.

    Scheduled runs sometimes attach to a signed-in Chrome window that Windows
    left on a split/offscreen monitor. DOM discovery still succeeds there, but
    the resulting physical click coordinates can be negative and miss the
    browser entirely. Move Chrome into a predictable visible work area before
    mouse-based upload actions.
    """
    try:
        rect = window.rectangle()
    except Exception:
        return None

    screen_width, screen_height = primary_screen_size()
    visible_enough = (
        rect.left >= 0
        and rect.top >= 0
        and rect.right <= screen_width
        and rect.bottom <= screen_height
        and rect.width() >= 900
        and rect.height() >= 650
    )
    if not visible_enough:
        width = min(max(int(rect.width() or 0), 1280), screen_width)
        height = min(max(int(rect.height() or 0), 900), screen_height)
        try:
            window.restore()
            time.sleep(0.2)
        except Exception:
            pass
        try:
            window.move_window(x=0, y=0, width=width, height=height, repaint=True)
            time.sleep(0.8)
        except Exception:
            try:
                window.move_window(0, 0, width, height)
                time.sleep(0.8)
            except Exception:
                force_window_to_primary(window, width, height)
    try:
        window.set_focus()
    except Exception:
        pass
    try:
        return window.rectangle()
    except Exception:
        return rect


def find_chrome_window(preferred_channel: str | None = None):
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

    preferred = (preferred_channel or "").lower().strip()

    def window_score(window) -> int:
        label = profile_label(window).lower()
        title = (window.window_text() or "").lower()
        score = 0
        # Publishing must use Fejiro's signed-in Chrome profile. The Mike/Michael
        # profile can have Una Labs tabs open, but Instagram is logged out there.
        if "fejiro" in label:
            score += 500
        if "michael" in label or "mike" in label:
            score -= 500
        if "sign up | linkedin" in title or "join linkedin" in title or "authwall" in title:
            score -= 500
        if "log into instagram" in title or "login" in title:
            score -= 300
        if "una_rect:" in title:
            score += 130
        if "unalabs" in title or "una labs" in title:
            score += 120
        if "linkedin" in title:
            score += 100
        if "instagram" in title:
            score += 95
        if preferred == "instagram":
            if "instagram" in title:
                score += 400
            if "linkedin" in title:
                score -= 120
        if preferred == "linkedin":
            if "linkedin" in title or "company page" in title:
                score += 300
            if "instagram" in title:
                score -= 80
        if "company page" in title or "page posts" in title:
            score += 40
        if "dice" in title or "gmail" in title or "jobs | linkedin" in title:
            score -= 60
        return score

    selected = sorted(candidates, key=window_score, reverse=True)[0]
    ensure_window_visible(selected)
    return selected


def screenshot(window, file_path: Path):
    file_path.parent.mkdir(parents=True, exist_ok=True)
    window.capture_as_image().save(file_path)
    return str(file_path.resolve())


def validate_instagram_caption(caption: str) -> list[str]:
    issues: list[str] = []
    clean = (caption or "").strip()
    words = [word for word in clean.split() if word.strip()]
    if len(words) < 45:
        issues.append(f"Instagram caption is too short: {len(words)} words.")
    if len(words) > 120:
        issues.append(f"Instagram caption is too long: {len(words)} words.")
    if "Source:" not in clean and "Sources:" not in clean:
        issues.append("Instagram caption is missing a Source/Sources line.")
    if "#" not in clean:
        issues.append("Instagram caption is missing hashtags.")
    lowered = clean.lower()
    if any(marker in lowered for marker in ["lorem ipsum", "caption goes here", "todo", "[source]", "[caption]"]):
        issues.append("Instagram caption contains placeholder text.")
    return issues


def set_clipboard_temporarily(value: str):
    old = pyperclip.paste()
    pyperclip.copy(value)
    return old


def restore_clipboard(value: str):
    try:
        pyperclip.copy(value)
    except Exception:
        pass


def navigate(window, url: str, wait: float = 5.0):
    ensure_window_visible(window)
    window.set_focus()
    time.sleep(0.3)
    old = set_clipboard_temporarily(url)
    try:
        keyboard.send_keys("^l")
        time.sleep(0.2)
        keyboard.send_keys("^v")
        keyboard.send_keys("{ENTER}")
        time.sleep(1.0)
        if "Leave site?" in visible_text(window):
            if not click_text_fallback(window, "Leave"):
                # Chrome's native leave-site dialog does not always expose a
                # reliable UIA button. The visible "Leave" button sits near the
                # center of the browser window in the confirmation dialog.
                click_relative(window, 0.56, 0.28, 0.8)
            keyboard.send_keys("^l")
            time.sleep(0.2)
            keyboard.send_keys("^v")
            keyboard.send_keys("{ENTER}")
            time.sleep(1.0)
        time.sleep(wait)
    finally:
        restore_clipboard(old)


def read_current_url(window) -> str:
    window.set_focus()
    old = pyperclip.paste()
    try:
        keyboard.send_keys("^l")
        time.sleep(0.2)
        keyboard.send_keys("^c")
        time.sleep(0.2)
        url = pyperclip.paste()
        keyboard.send_keys("{ESC}")
        return url
    finally:
        restore_clipboard(old)


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


def run_js(window, payload: str, wait: float = 1.0):
    ensure_window_visible(window)
    window.set_focus()
    time.sleep(0.2)
    keyboard.send_keys("^l")
    time.sleep(0.15)
    # Chrome strips pasted javascript: URLs, so type the scheme and paste only
    # the payload. Type it in two chunks; on some visible sessions the first
    # characters can be swallowed when the omnibox is still settling.
    keyboard.send_keys("java")
    time.sleep(0.05)
    keyboard.send_keys("script:")
    time.sleep(0.05)
    old = set_clipboard_temporarily(" ".join(payload.splitlines()))
    try:
        keyboard.send_keys("^v")
        keyboard.send_keys("{ENTER}")
        time.sleep(wait)
    finally:
        restore_clipboard(old)


def click_dom(window, pattern: str, wait: float = 1.0) -> dict:
    marker = "UNA_RECT:"
    payload = r"""(() => {
  const pattern = new RegExp(%s, 'i');
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const candidates = [...document.querySelectorAll('button,a,input[type="button"],input[type="submit"],[role="button"],[role="menuitem"],div[aria-label],svg[aria-label]')];
  const target = candidates.find((el) => pattern.test(clean(el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || '')));
  if (!target) {
    document.title = 'UNA_RECT:' + JSON.stringify({ ok: false, reason: 'not-found', pattern: String(pattern) });
    return;
  }
  target.scrollIntoView({ block: 'center', inline: 'center' });
  target.focus();
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
  target.click();
  setTimeout(() => {
    const rect = target.getBoundingClientRect();
    document.title = 'UNA_RECT:' + JSON.stringify({
      ok: true,
      text: clean(target.innerText || target.textContent || target.value || target.getAttribute('aria-label') || ''),
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    });
  }, 100);
})()""" % json.dumps(pattern)
    run_js(window, payload, 0.8)
    title = window.window_text() or ""
    start = title.find(marker)
    if start < 0:
        return {"ok": False, "reason": "marker not found", "title": title}
    raw = title[start + len(marker):].split(" - Google Chrome", 1)[0]
    try:
        rect = json.loads(raw)
    except Exception as exc:
        return {"ok": False, "reason": f"parse failed: {exc}", "raw": raw}
    if not rect.get("ok"):
        return rect
    time.sleep(wait)
    return {"ok": True, "coords": None, "rect": rect, "mode": "dom_click"}


def click_dom_physical(window, pattern: str, wait: float = 1.0) -> dict:
    """Find a DOM element, then click it with a real mouse event at screen coords.

    Browser file pickers often ignore synthetic DOM clicks. A physical click keeps
    the upload path working while still using DOM discovery for resilience.
    """
    marker = "UNA_RECT:"
    payload = r"""(() => {
  const pattern = new RegExp(%s, 'i');
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const candidates = [...document.querySelectorAll('button,a,input[type="button"],input[type="submit"],[role="button"],div[aria-label]')];
  const target = candidates.find((el) => pattern.test(clean(el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || '')));
  if (!target) {
    document.title = 'UNA_RECT:' + JSON.stringify({ ok: false, reason: 'not-found', pattern: String(pattern) });
    return;
  }
  target.scrollIntoView({ block: 'center', inline: 'center' });
  const rect = target.getBoundingClientRect();
  document.title = 'UNA_RECT:' + JSON.stringify({
    ok: true,
    text: clean(target.innerText || target.textContent || target.value || target.getAttribute('aria-label') || ''),
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  });
})()""" % json.dumps(pattern)
    run_js(window, payload, 0.5)
    title = window.window_text() or ""
    start = title.find(marker)
    if start < 0:
        return {"ok": False, "reason": "marker not found", "title": title}
    raw = title[start + len(marker):].split(" - Google Chrome", 1)[0]
    try:
        rect = json.loads(raw)
    except Exception as exc:
        return {"ok": False, "reason": f"parse failed: {exc}", "raw": raw}
    if not rect.get("ok"):
        return rect
    win = ensure_window_visible(window) or window.rectangle()
    x = win.left + int(rect["x"] + rect["width"] / 2)
    y = win.top + int(rect["y"] + rect["height"] / 2)
    screen_width, screen_height = primary_screen_size()
    if x < 0 or y < 0 or x >= screen_width or y >= screen_height:
        return {
            "ok": False,
            "reason": "physical click would land outside primary screen",
            "coords": [x, y],
            "windowRect": rect_payload(win),
            "screen": [screen_width, screen_height],
            "rect": rect,
        }
    window.set_focus()
    time.sleep(0.2)
    mouse.click(button="left", coords=(x, y))
    time.sleep(wait)
    return {"ok": True, "coords": [x, y], "rect": rect, "mode": "dom_physical_click"}


def click_instagram_create(window, wait: float = 1.0) -> dict:
    marker = "UNA_RECT:"
    payload = r"""(() => {
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const candidates = [...document.querySelectorAll('button,a,[role="button"],div[aria-label],svg[aria-label]')].map((el) => {
    const rect = el.getBoundingClientRect();
    const text = clean(el.innerText || el.textContent || el.getAttribute('aria-label') || '');
    return { el, text, rect };
  });
  const target = candidates.find(({ text, rect }) =>
    /^Create$/i.test(text)
    && rect.x < 140
    && rect.width > 0
    && rect.height > 0
  ) || candidates.find(({ text, rect }) =>
    /^New post$/i.test(text)
    && rect.x < 120
    && rect.y > window.innerHeight * 0.70
    && rect.width > 0
    && rect.height > 0
  );
  if (!target) {
    document.title = 'UNA_RECT:' + JSON.stringify({ ok: false, reason: 'instagram-create-not-found' });
    return;
  }
  const clickEl = target.el.closest('a,button,[role="button"]') || target.el;
  clickEl.scrollIntoView({ block: 'center', inline: 'center' });
  clickEl.focus();
  clickEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  clickEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
  clickEl.click();
  setTimeout(() => {
    const rect = clickEl.getBoundingClientRect();
    document.title = 'UNA_RECT:' + JSON.stringify({
      ok: true,
      text: target.text,
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    });
  }, 100);
})()"""
    run_js(window, payload, 0.8)
    title = window.window_text() or ""
    start = title.find(marker)
    if start < 0:
        return {"ok": False, "reason": "marker not found", "title": title}
    raw = title[start + len(marker):].split(" - Google Chrome", 1)[0]
    try:
        rect = json.loads(raw)
    except Exception as exc:
        return {"ok": False, "reason": f"parse failed: {exc}", "raw": raw}
    if not rect.get("ok"):
        return rect
    time.sleep(wait)
    return {"ok": True, "coords": None, "rect": rect, "mode": "dom_click"}


def force_instagram_create_with_bookmarklet(window, wait: float = 1.5) -> dict:
    """Open Instagram's Create modal with an address-bar JS click.

    Instagram's left rail sometimes ignores UIA and coordinate clicks, while the
    same element still responds to JavaScript inside the page. This mirrors the
    manual recovery path that successfully opened the composer on 2026-07-17.
    """
    payload = r"""(() => {
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const elements = [...document.querySelectorAll('a,button,[role="button"],div[aria-label],svg[aria-label]')];
  const target = elements.find((el) => /^Create$/i.test(clean(el.innerText || el.textContent || el.getAttribute('aria-label') || '')))
    || elements.find((el) => /Create/i.test(clean(el.innerText || el.textContent || el.getAttribute('aria-label') || '')));
  if (!target) {
    document.title = 'UNA_IG_CREATE_MISSING';
    return;
  }
  const clickEl = target.closest('a,button,[role="button"]') || target;
  clickEl.scrollIntoView({ block: 'center', inline: 'center' });
  clickEl.focus();
  clickEl.click();
  document.title = 'UNA_IG_CREATE_CLICKED';
})()"""
    run_js(window, payload, wait)
    if "Create new post" in visible_text(window) or "Select from computer" in visible_text(window):
        return {"ok": True, "mode": "bookmarklet"}
    return {"ok": False, "mode": "bookmarklet", "reason": "Create modal did not open after bookmarklet click."}


def force_instagram_create_with_visible_clicks(window, proof_dir: Path, wait: float = 1.0) -> dict:
    """Use visible fallbacks for compact or split Instagram windows."""
    detail = {"ok": False, "mode": "visible_clicks", "steps": []}
    attempts = [
        ("uia_contains_create", lambda: click_text_contains_fallback(window, r"^(Create|New post)$")),
        ("left_rail_plus_large", lambda: click_relative(window, 0.022, 0.625, wait)),
        ("left_rail_plus_compact", lambda: click_relative(window, 0.026, 0.705, wait)),
        ("left_rail_create_text", lambda: click_relative(window, 0.038, 0.455, wait)),
    ]
    for label, action in attempts:
        try:
            result = action()
            detail["steps"].append({"action": label, "result": result})
        except Exception as exc:
            detail["steps"].append({"action": label, "error": str(exc)})
        time.sleep(wait)
        if "Create new post" in visible_text(window) or "Select from computer" in visible_text(window):
            detail["ok"] = True
            detail["openedBy"] = label
            detail["proof"] = screenshot(window, proof_dir / "visible-instagram-create-fallback-open.png")
            return detail
    detail["proof"] = screenshot(window, proof_dir / "visible-instagram-create-fallback-missing.png")
    detail["reason"] = "Create modal did not open after visible fallbacks."
    return detail


def paste_text(window, text: str, select_all: bool = False):
    window.set_focus()
    old = set_clipboard_temporarily(text)
    try:
        if select_all:
            keyboard.send_keys("^a")
            time.sleep(0.1)
        keyboard.send_keys("^v")
        time.sleep(0.4)
    finally:
        restore_clipboard(old)


def current_window_handles() -> set[int]:
    handles = set()
    for backend in ("uia", "win32"):
        try:
            windows = Desktop(backend=backend).windows()
        except Exception:
            continue
        for candidate in windows:
            try:
                handles.add(candidate.handle)
            except Exception:
                pass
    return handles


def find_file_picker(before_handles: set[int], timeout: float = 15.0):
    fallback_match = None
    fallback_title = ""
    deadline = time.time() + timeout
    while time.time() < deadline:
        time.sleep(0.4)
        for backend in ("uia", "win32"):
            try:
                windows = Desktop(backend=backend).windows()
            except Exception:
                continue
            for candidate in windows:
                try:
                    if candidate.handle in before_handles:
                        continue
                    title = candidate.window_text() or ""
                    class_name = candidate.class_name() or ""
                except Exception:
                    continue
                lowered = title.lower()
                is_file_dialog = (
                    class_name == "#32770"
                    and (
                        "open" in lowered
                        or "choose" in lowered
                        or "upload" in lowered
                        or "file" in lowered
                    )
                )
                is_new_explorer_picker = candidate.handle not in before_handles and class_name == "CabinetWClass"
                if candidate.handle in before_handles:
                    if is_file_dialog and fallback_match is None:
                        fallback_match = candidate
                        fallback_title = title
                    continue
                if is_file_dialog or is_new_explorer_picker:
                    return candidate, title
    return fallback_match, fallback_title


def fill_file_picker(picker, file_paths):
    picker.set_focus()
    time.sleep(0.3)
    paths = [Path(item).resolve() for item in file_paths]
    if len(paths) == 1:
        value = str(paths[0])
    else:
        value = " ".join(f'"{path}"' for path in paths)
    old = set_clipboard_temporarily(value)
    try:
        keyboard.send_keys("%n")
        time.sleep(0.2)
        keyboard.send_keys("^a")
        keyboard.send_keys("^v")
        keyboard.send_keys("{ENTER}")
        time.sleep(1.5)
    finally:
        restore_clipboard(old)


def click_visible_upload_button(window, x_ratio: float, y_ratio: float, wait: float = 0.8) -> list[int]:
    """Click a known visible upload control with the real mouse.

    Some Instagram/LinkedIn upload buttons are visible and stable but do not
    always expose reliable UIA names. Use this only after DOM/text attempts have
    failed to produce a native file picker.
    """
    return click_relative(window, x_ratio, y_ratio, wait)


def click_text_fallback(window, label: str) -> bool:
    win = window.rectangle()
    for control in window.descendants():
        try:
            text = (control.window_text() or "").strip()
            rect = control.rectangle()
        except Exception:
            continue
        if text.lower() == label.lower():
            if rect.bottom <= win.top or rect.top >= win.bottom or rect.right <= win.left or rect.left >= win.right:
                continue
            try:
                control.click_input()
                time.sleep(0.8)
                return True
            except Exception:
                pass
    return False


def click_text_contains_fallback(window, pattern: str) -> bool:
    """Click a visible control whose UIA text contains a useful label."""
    import re

    rx = re.compile(pattern, re.I)
    win = window.rectangle()
    matches = []
    for control in window.descendants():
        try:
            text = (control.window_text() or "").strip()
            rect = control.rectangle()
        except Exception:
            continue
        if not text or not rx.search(text):
            continue
        if rect.bottom <= win.top or rect.top >= win.bottom or rect.right <= win.left or rect.left >= win.right:
            continue
        matches.append((rect.top, rect.left, control))
    for _top, _left, control in sorted(matches):
        try:
            control.click_input()
            time.sleep(0.8)
            return True
        except Exception:
            pass
    return False


def click_relative(window, x_ratio: float, y_ratio: float, wait: float = 0.8) -> list[int]:
    rect = ensure_window_visible(window) or window.rectangle()
    x = rect.left + int(rect.width() * x_ratio)
    y = rect.top + int(rect.height() * y_ratio)
    screen_width, screen_height = primary_screen_size()
    if x < 0 or y < 0 or x >= screen_width or y >= screen_height:
        try:
            window.restore()
            window.move_window(0, 0, min(1400, screen_width), min(950, screen_height), repaint=True)
            time.sleep(0.8)
            rect = window.rectangle()
            x = rect.left + int(rect.width() * x_ratio)
            y = rect.top + int(rect.height() * y_ratio)
        except Exception:
            pass
    if x < 0 or y < 0 or x >= screen_width or y >= screen_height:
        force_window_to_primary(window)
        rect = window.rectangle()
        x = rect.left + int(rect.width() * x_ratio)
        y = rect.top + int(rect.height() * y_ratio)
    if x < 0 or y < 0 or x >= screen_width or y >= screen_height:
        raise RuntimeError(
            f"Visible browser click would land outside the primary screen: coords={[x, y]}, "
            f"window={rect_payload(rect)}, screen={[screen_width, screen_height]}"
        )
    mouse.click(button="left", coords=(x, y))
    time.sleep(wait)
    return [x, y]


def linkedin_composer_is_open(window) -> bool:
    text = visible_text(window)
    return (
        "Post to Anyone" in text
        or "Enhance post" in text
        or ("What do you want to talk about" in text and "Start a post" not in text)
    )


def open_linkedin_post_composer(window, proof_dir: Path) -> dict:
    detail = {"steps": [], "mode": "strict_page_posts_only"}
    navigate(window, "https://www.linkedin.com/company/112328320/admin/page-posts/published/", 5)
    detail["steps"].append({"action": "navigate_page_posts"})
    detail["page_posts"] = screenshot(window, proof_dir / "visible-linkedin-page-posts.png")

    text = visible_text(window)
    if "Sign in" in text and "Password" in text:
        return {"ok": False, "reason": "LinkedIn login form is visible.", **detail}

    if not linkedin_composer_is_open(window):
        # Keep this path deterministic: Page Posts -> Start a post -> composer.
        # If LinkedIn changes the surface, stop with proof instead of navigating
        # to Dashboard/Create and risking an out-of-sequence duplicate attempt.
        started = False
        if "Start a post" in text:
            physical = click_dom_physical(window, r"Start a post", 1.2)
            if physical.get("ok"):
                detail["steps"].append({"action": "clicked_start_post_physical", "detail": physical})
                started = True
            elif click_dom(window, r"Start a post", 1.2).get("ok") or click_text_fallback(window, "Start a post"):
                detail["steps"].append({"action": "clicked_start_post"})
                started = True
        if not started:
            try:
                coords = click_relative(window, 0.49, 0.405, 2.0)
                detail["steps"].append({"action": "clicked_start_post_page_posts_coordinate", "coords": coords})
                started = True
            except Exception as exc:
                detail["start_post_missing"] = screenshot(window, proof_dir / "visible-linkedin-start-post-missing.png")
                detail["steps"].append({"action": "start_post_coordinate_failed", "error": str(exc)})
                return {"ok": False, "reason": "LinkedIn Start a post control was not visible on Page Posts.", **detail}

    for _ in range(8):
        if linkedin_composer_is_open(window):
            break
        time.sleep(1.0)

    if not linkedin_composer_is_open(window) and started:
        # LinkedIn sometimes acknowledges the physical click without opening the
        # modal on the first attempt. Retry the same Page Posts control once,
        # then wait longer before blocking.
        retry = click_dom(window, r"Start a post", 2.0)
        detail["steps"].append({"action": "retry_start_post_dom", "detail": retry})
        if not retry.get("ok"):
            retry_physical = click_dom_physical(window, r"Start a post", 2.0)
            detail["steps"].append({"action": "retry_start_post_physical", "detail": retry_physical})
        for _ in range(10):
            if linkedin_composer_is_open(window):
                break
            time.sleep(1.0)

    if not linkedin_composer_is_open(window):
        detail["composer_missing"] = screenshot(window, proof_dir / "visible-linkedin-composer-missing.png")
        return {"ok": False, "reason": "LinkedIn composer did not open.", **detail}

    detail["composer_open"] = screenshot(window, proof_dir / "visible-linkedin-composer-open.png")
    return {"ok": True, **detail}


def fill_linkedin_composer(window, post: str, proof_dir: Path) -> dict:
    detail = {"steps": []}
    # The editor is a contenteditable region inside a modal. UIA text controls are
    # inconsistent here, so use the same visible coordinate approach as job apply.
    click_dom(window, r"What do you want to talk about|Text editor", 0.4)
    coords = click_relative(window, 0.50, 0.34, 0.3)
    detail["steps"].append({"action": "focus_editor_coordinate", "coords": coords})
    paste_text(window, post, select_all=True)
    time.sleep(1.2)
    detail["post_filled"] = screenshot(window, proof_dir / "visible-linkedin-post-filled.png")
    text = visible_text(window)
    title = post.splitlines()[0].strip()
    if title not in text:
        detail["post_not_visible"] = screenshot(window, proof_dir / "visible-linkedin-post-text-missing.png")
        return {"ok": False, "reason": "LinkedIn composer text was not visible after paste.", **detail}
    return {"ok": True, **detail}


def close_linkedin_composer(window, proof_dir: Path, reason: str) -> dict:
    """Close a partially filled composer so blocked runs are not left pending."""
    detail = {"ok": False, "reason": reason, "steps": []}
    detail["before_cleanup"] = screenshot(window, proof_dir / "visible-linkedin-composer-before-cleanup.png")
    attempts = [
        ("escape", lambda: keyboard.send_keys("{ESC}")),
        ("close_text", lambda: click_text_fallback(window, "Close")),
        ("close_dom", lambda: click_dom(window, r"^(Close|x)$", 0.8).get("ok")),
        ("close_coordinate", lambda: click_relative(window, 0.70, 0.165, 0.8)),
    ]
    for label, action in attempts:
        try:
            result = action()
            detail["steps"].append({"action": label, "result": result})
        except Exception as exc:
            detail["steps"].append({"action": label, "error": str(exc)})
        time.sleep(0.8)
        if not linkedin_composer_is_open(window):
            detail["ok"] = True
            detail["after_cleanup"] = screenshot(window, proof_dir / "visible-linkedin-composer-cleaned-up.png")
            return detail
    detail["after_cleanup"] = screenshot(window, proof_dir / "visible-linkedin-composer-cleanup-failed.png")
    return detail


def dismiss_linkedin_premium_prompt(window, proof_dir: Path) -> dict:
    """Close LinkedIn's Premium Page prompt when it covers composer controls."""
    detail = {"ok": False, "steps": []}
    text = visible_text(window)
    if "Try Premium Page" not in text and "Save time and grow your audience" not in text:
        detail["reason"] = "premium prompt not visible"
        return detail

    payload = r"""(() => {
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const buttons = [...document.querySelectorAll('button,[role="button"]')].map((el) => {
    const rect = el.getBoundingClientRect();
    const text = clean(el.innerText || el.textContent || el.getAttribute('aria-label') || '');
    return { el, text, rect };
  });
  const target = buttons.find(({ text, rect }) =>
    /^(dismiss|close|×|x)$/i.test(text)
    && rect.y > window.innerHeight * 0.40
    && rect.width > 0
    && rect.height > 0
  );
  if (!target) {
    document.title = 'UNA_PREMIUM:' + JSON.stringify({ ok: false, reason: 'close-button-not-found' });
    return;
  }
  target.el.click();
  document.title = 'UNA_PREMIUM:' + JSON.stringify({ ok: true, text: target.text, x: Math.round(target.rect.x), y: Math.round(target.rect.y) });
})()"""
    run_js(window, payload, 0.8)
    time.sleep(0.6)
    if "Try Premium Page" not in visible_text(window) and "Save time and grow your audience" not in visible_text(window):
        detail["ok"] = True
        detail["steps"].append({"action": "dismissed_premium_prompt_by_dom"})
        return detail

    # Coordinate fallback for the small close button on the Premium popover.
    try:
        coords = click_relative(window, 0.62, 0.59, 0.8)
        detail["steps"].append({"action": "dismissed_premium_prompt_by_coordinate", "coords": coords})
    except Exception as exc:
        detail["steps"].append({"action": "premium_prompt_coordinate_failed", "error": str(exc)})
    if "Try Premium Page" not in visible_text(window) and "Save time and grow your audience" not in visible_text(window):
        detail["ok"] = True
        return detail
    detail["proof"] = screenshot(window, proof_dir / "visible-linkedin-premium-prompt-blocking.png")
    detail["reason"] = "premium prompt remained visible"
    return detail


def attach_linkedin_images(window, image_paths: list[Path], proof_dir: Path) -> dict:
    detail = {"steps": [], "imageCount": len(image_paths)}
    prompt = dismiss_linkedin_premium_prompt(window, proof_dir)
    if prompt.get("steps"):
        detail["steps"].extend(prompt["steps"])
    if click_text_fallback(window, "Remove media"):
        detail["steps"].append({"action": "removed_link_preview_media"})
        time.sleep(1.0)
    before = current_window_handles()
    clicked = (
        click_dom_physical(window, r"^Add media$|Add a photo|Add photo|Photo|Image|Media", 1.0).get("ok")
        or click_text_fallback(window, "Add media")
        or click_text_fallback(window, "Photo")
        or click_text_fallback(window, "Add photo")
        or click_text_contains_fallback(window, r"Add media|Add photo|Photo|Image|Media")
    )
    if not clicked:
        # In the LinkedIn composer, the media button is usually in the lower
        # toolbar. Coordinate fallback is only used after text/DOM attempts.
        coords = click_relative(window, 0.40, 0.735, 1.0)
        detail["steps"].append({"action": "linkedin_media_coordinate_fallback", "coords": coords})
    else:
        detail["steps"].append({"action": "linkedin_media_button_clicked"})

    picker, picker_title = find_file_picker(before, 8)
    if not picker:
        # If DOM/text click hit the wrong toolbar item, try the visible photo
        # icon in the lower-left composer toolbar and wait again.
        prompt = dismiss_linkedin_premium_prompt(window, proof_dir)
        if prompt.get("steps"):
            detail["steps"].extend(prompt["steps"])
        for idx, (x_ratio, y_ratio) in enumerate(((0.40, 0.735), (0.66, 0.735), (0.64, 0.80), (0.34, 0.735)), start=1):
            before = current_window_handles()
            coords = click_visible_upload_button(window, x_ratio, y_ratio, 1.0)
            detail["steps"].append({"action": "linkedin_media_coordinate_retry", "attempt": idx, "coords": coords})
            picker, picker_title = find_file_picker(before, 5)
            if picker:
                break
    if not picker:
        detail["media_missing"] = screenshot(window, proof_dir / "visible-linkedin-media-picker-missing.png")
        return {"ok": False, "reason": "LinkedIn media file picker did not open.", **detail}

    fill_file_picker(picker, image_paths)
    time.sleep(4)
    detail["media_selected"] = screenshot(window, proof_dir / "visible-linkedin-media-selected.png")
    editor_text = visible_text(window)
    if "Editor" in editor_text and "Next" in editor_text:
        if not (click_text_fallback(window, "Next") or click_dom(window, r"^Next$", 1.5).get("ok")):
            detail["media_editor_next_missing"] = screenshot(window, proof_dir / "visible-linkedin-media-editor-next-missing.png")
            return {"ok": False, "reason": "LinkedIn media editor opened but Next could not be clicked.", **detail}
        time.sleep(3.0)
        detail["media_confirmed"] = screenshot(window, proof_dir / "visible-linkedin-media-confirmed.png")
    after_text = visible_text(window)
    if "Editor" in after_text and "Next" in after_text:
        detail["media_still_in_editor"] = screenshot(window, proof_dir / "visible-linkedin-media-still-in-editor.png")
        return {"ok": False, "reason": "LinkedIn media editor was still open after attempting to confirm the image.", **detail}
    return {"ok": True, **detail}


def click_linkedin_post_button(window, proof_dir: Path) -> dict:
    detail = {"steps": []}
    if click_text_fallback(window, "Post"):
        detail["steps"].append({"action": "clicked_post_by_text"})
    elif click_dom(window, r"^Post$", 1.2).get("ok"):
        detail["steps"].append({"action": "clicked_post_by_dom"})
    else:
        # Bottom-right of LinkedIn's post modal on this visible Chrome layout.
        coords = click_relative(window, 0.69, 0.77, 2.0)
        detail["steps"].append({"action": "clicked_post_coordinate", "coords": coords})

    time.sleep(3.0)
    still_text = visible_text(window)
    if "Post successful" in still_text or "View post" in still_text:
        detail["after_post"] = screenshot(window, proof_dir / "visible-linkedin-after-post.png")
        detail["steps"].append({"action": "detected_post_success_modal"})
        return {"ok": True, **detail}
    if "What do you want to talk about" in still_text:
        detail["post_missing"] = screenshot(window, proof_dir / "visible-linkedin-post-missing.png")
        return {"ok": False, "reason": "LinkedIn Post button was not clicked or remained disabled.", **detail}
    detail["after_post"] = screenshot(window, proof_dir / "visible-linkedin-after-post.png")
    return {"ok": True, **detail}


def verify_linkedin_post(window, post: str, proof_dir: Path, expected_media: bool = False) -> dict:
    title = post.splitlines()[0].strip()
    navigate(window, "https://www.linkedin.com/company/112328320/admin/page-posts/published/", 5)
    proof = screenshot(window, proof_dir / "visible-linkedin-posts-verify.png")
    text = visible_text(window)
    if title in text:
        if expected_media:
            # Open the newest matching post so verification is not satisfied by
            # text-only Page-card summaries. The detail page must visibly include
            # an image/media region before we call the publish verified.
            opened = click_text_fallback(window, title[:80])
            if opened:
                media_proof = screenshot(window, proof_dir / "visible-linkedin-post-detail-verify.png")
                detail_text = visible_text(window)
                if "Activate to view larger image" in detail_text or "Image" in detail_text or "Photo" in detail_text:
                    return {"ok": True, "proof": proof, "mediaProof": media_proof, "reason": "New LinkedIn post text and media are visible."}
                return {"ok": False, "proof": proof, "mediaProof": media_proof, "reason": "New LinkedIn post text is visible, but media was not visible on the post detail."}
            return {"ok": False, "proof": proof, "reason": "New LinkedIn post text is visible, but the post could not be opened for media verification."}
        return {"ok": True, "proof": proof, "reason": "New LinkedIn post text is visible on Page posts."}
    return {"ok": False, "proof": proof, "reason": "Page posts proof did not show today's LinkedIn post text."}


def publish_instagram(window, run_date: str, image_paths: list[Path], caption: str, proof_dir: Path, dry_run: bool) -> dict:
    result = {"channel": "instagram", "status": "started", "proof": {}, "url": ""}
    navigate(window, "https://www.instagram.com/", 5)
    keyboard.send_keys("{ESC}")
    time.sleep(0.5)
    result["proof"]["home"] = screenshot(window, proof_dir / "visible-instagram-home.png")
    text = visible_text(window)
    if "Log in" in text and "Password" in text:
        result.update(status="blocked_needs_login", reason="Instagram login form is visible.")
        return result

    create_click = click_instagram_create(window, 1.8)
    click = {"ok": create_click.get("ok", False), "reason": "clicked Instagram create by DOM", "createClick": create_click}
    if "Create new post" not in visible_text(window) and "Select from computer" not in visible_text(window):
        bookmarklet_click = force_instagram_create_with_bookmarklet(window, 1.5)
        click["bookmarkletFallback"] = bookmarklet_click
    if "Create new post" not in visible_text(window) and "Select from computer" not in visible_text(window):
        visible_click = force_instagram_create_with_visible_clicks(window, proof_dir, 0.8)
        click["visibleFallback"] = visible_click
    if "Create new post" not in visible_text(window) and "Select from computer" not in visible_text(window):
        result.update(status="blocked_no_create_modal", reason="Instagram Create modal did not open from the home page.", clickCreate=click)
        result["proof"]["error"] = screenshot(window, proof_dir / "visible-instagram-create-missing.png")
        return result
    time.sleep(1.0)
    if "Create new post" in visible_text(window) or "Select from computer" in visible_text(window):
        result["proof"]["composer_open"] = screenshot(window, proof_dir / "visible-instagram-composer-open.png")
    picker = None
    picker_title = ""
    for attempt in range(3):
        before = current_window_handles()
        page_text = visible_text(window)
        if "Select from computer" in page_text:
            clicked = bool(click_dom_physical(window, r"Select from computer", 0.8).get("ok"))
            if not clicked:
                clicked = click_text_fallback(window, "Select from computer")
            if not clicked:
                click_relative(window, 0.50, 0.64, 0.8)
        elif "Create new post" in page_text:
            click_relative(window, 0.50, 0.64, 0.8)
        else:
            result.update(status="blocked_create_modal_lost", reason="Instagram Create modal disappeared before file upload.", clickCreate=click)
            result["proof"]["error"] = screenshot(window, proof_dir / "visible-instagram-modal-lost.png")
            return result
        picker, picker_title = find_file_picker(before, 6)
        if not picker and ("Select from computer" in page_text or "Create new post" in page_text):
            before = current_window_handles()
            coords = click_visible_upload_button(window, 0.50, 0.65, 0.8)
            result.setdefault("uploadRetries", []).append({"attempt": attempt + 1, "coords": coords})
            picker, picker_title = find_file_picker(before, 6)
        if picker:
            break
    if not picker:
        result.update(status="blocked_no_file_picker", reason="Instagram file picker did not open.", clickCreate=click)
        result["proof"]["error"] = screenshot(window, proof_dir / "visible-instagram-error.png")
        return result

    fill_file_picker(picker, image_paths)
    time.sleep(3)
    result["proof"]["image_selected"] = screenshot(window, proof_dir / "visible-instagram-image-selected.png")
    result["imageCount"] = len(image_paths)

    for _ in range(3):
        if "Next" in visible_text(window):
            click_text_fallback(window, "Next") or click_dom(window, r"^Next$", 1.2)
            time.sleep(1.2)

    if "Write a caption" in visible_text(window) or "Add a caption" in visible_text(window):
        click_dom(window, r"Write a caption|Add a caption", 0.5)
    # Instagram's caption box often exposes little useful UIA text. Click the
    # visible right-side composer area before paste so we do not silently post
    # an image with an empty caption.
    click_relative(window, 0.66, 0.32, 0.3)
    paste_text(window, caption)
    time.sleep(1)
    result["proof"]["caption_filled"] = screenshot(window, proof_dir / "visible-instagram-caption-filled.png")

    if caption.splitlines()[0].strip() not in visible_text(window):
        result.update(status="blocked_caption_not_filled", reason="Instagram caption was not visible after paste.")
        result["proof"]["error"] = screenshot(window, proof_dir / "visible-instagram-caption-missing.png")
        return result

    if dry_run:
        result.update(status="dry_run_ready", reason="Instagram carousel and caption reached the share step.")
        return result

    if not (click_text_fallback(window, "Share") or click_dom(window, r"^Share$", 1.5).get("ok")):
        result.update(status="blocked_no_share_button", reason="Share button not found.")
        result["proof"]["error"] = screenshot(window, proof_dir / "visible-instagram-share-missing.png")
        return result

    time.sleep(8)
    result["proof"]["after_share"] = screenshot(window, proof_dir / "visible-instagram-after-share.png")
    navigate(window, "https://www.instagram.com/unalabs.cloud/", 4)
    result["proof"]["profile_verify"] = screenshot(window, proof_dir / "visible-instagram-profile-verify.png")
    result.update(status="posted_unverified", reason="Share clicked; profile screenshot captured.")
    return result


def publish_linkedin(window, post: str, image_paths: list[Path], proof_dir: Path, dry_run: bool) -> dict:
    result = {"channel": "linkedin", "status": "started", "proof": {}, "url": ""}
    opened = open_linkedin_post_composer(window, proof_dir)
    result["proof"].update({k: v for k, v in opened.items() if isinstance(v, str) and k not in ("reason",)})
    if not opened.get("ok"):
        result.update(status="blocked_no_composer", reason=opened.get("reason", "LinkedIn composer did not open."), details=opened)
        return result

    filled = fill_linkedin_composer(window, post, proof_dir)
    result["proof"].update({k: v for k, v in filled.items() if isinstance(v, str) and k not in ("reason",)})
    if not filled.get("ok"):
        result.update(status="blocked_text_not_filled", reason=filled.get("reason", "LinkedIn text was not filled."), details=filled)
        return result

    if image_paths:
        attached = attach_linkedin_images(window, image_paths, proof_dir)
        result["proof"].update({k: v for k, v in attached.items() if isinstance(v, str) and k not in ("reason",)})
        result["imageCount"] = len(image_paths)
        if not attached.get("ok"):
            result.update(status="blocked_media_not_attached", reason=attached.get("reason", "LinkedIn image was not attached."), details=attached)
            result["cleanup"] = close_linkedin_composer(window, proof_dir, result["reason"])
            return result

    if dry_run:
        result.update(status="dry_run_ready", reason="LinkedIn post composer reached with text and image filled.")
        return result

    posted = click_linkedin_post_button(window, proof_dir)
    result["proof"].update({k: v for k, v in posted.items() if isinstance(v, str) and k not in ("reason",)})
    if not posted.get("ok"):
        result.update(status="blocked_no_post_button", reason=posted.get("reason", "LinkedIn Post button not found."), details=posted)
        return result

    verify = verify_linkedin_post(window, post, proof_dir, expected_media=bool(image_paths))
    result["proof"]["posts_verify"] = verify["proof"]
    if verify.get("mediaProof"):
        result["proof"]["post_detail_verify"] = verify["mediaProof"]
    if verify.get("ok"):
        result.update(status="posted_verified", reason=verify["reason"])
    else:
        result.update(status="posted_unverified", reason=verify["reason"])
    return result


def append_ledger(entry: dict):
    ledger = ROOT / "content" / "ledger" / "social-ledger.jsonl"
    ledger.parent.mkdir(parents=True, exist_ok=True)
    with ledger.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def file_hash(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def image_hashes(paths: list[Path]) -> list[str]:
    return [file_hash(path) for path in paths if path.exists()]


def approval_asset_proof(approval: dict, image_paths: list[Path]) -> dict:
    slides = approval.get("slides") or []
    return {
        "imageHashes": image_hashes(image_paths),
        "rawImageHashes": [slide.get("rawFingerprint") for slide in slides if slide.get("rawFingerprint")],
        "sourceUrls": [slide.get("assetSourceUrl") for slide in slides if slide.get("assetSourceUrl")],
        "images": [str(path) for path in image_paths],
    }


def load_ledger_entries() -> list[dict]:
    ledger = ROOT / "content" / "ledger" / "social-ledger.jsonl"
    if not ledger.exists():
        return []
    entries = []
    for line in ledger.read_text(encoding="utf-8", errors="ignore").splitlines():
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
            if isinstance(entry, dict):
                entries.append(entry)
        except json.JSONDecodeError:
            continue
    return entries


def already_posted_same_images(run_date: str, slot: str, channel: str, proof: dict) -> dict:
    if os.environ.get("UNA_ALLOW_REPOST") == "1":
        return {"duplicate": False, "reason": "repost override enabled"}
    hashes = proof.get("imageHashes") or []
    raw_hashes = proof.get("rawImageHashes") or []
    source_urls = proof.get("sourceUrls") or []
    wanted = set(
        hashes
        + raw_hashes
        + [f"source:{normalize_story_url(url)}" for url in source_urls if normalize_story_url(url)]
    )
    if not wanted:
        return {"duplicate": False, "reason": "no hashes or source URLs"}
    for entry in reversed(load_ledger_entries()):
        if entry.get("dryRun"):
            continue
        if entry.get("runDate") == run_date and entry.get("slot", "news") == slot:
            continue
        previous = set()
        for result in (entry.get("results") or {}).values():
            if not str(result.get("status", "")).startswith("posted"):
                continue
            previous_proof = result.get("assetProof") or {}
            previous.update(previous_proof.get("imageHashes") or [])
            previous.update(previous_proof.get("rawImageHashes") or [])
            previous.update(
                f"source:{normalize_story_url(url)}"
                for url in previous_proof.get("sourceUrls") or []
                if normalize_story_url(url)
            )
        if previous and wanted.intersection(previous):
            return {
                "duplicate": True,
                "reason": f"{channel} would reuse an image/source identity from an earlier Una Labs edition.",
                "previousRunId": entry.get("id"),
                "previousRunDate": entry.get("runDate"),
                "previousSlot": entry.get("slot", "news"),
            }
    return {"duplicate": False, "reason": "no matching posted image/source identities"}


def normalize_story_url(value: str) -> str:
    value = str(value or "").strip()
    if not value:
        return ""
    try:
        from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
        parts = urlsplit(value)
        query = [
            (key, item)
            for key, item in parse_qsl(parts.query, keep_blank_values=True)
            if not key.lower().startswith("utm_") and key.lower() not in {"fbclid", "gclid", "mc_cid", "mc_eid"}
        ]
        host = parts.netloc.lower()
        if host.startswith("www."):
            host = host[4:]
        clean_path = parts.path.rstrip("/") or "/"
        return urlunsplit((parts.scheme.lower(), host, clean_path, urlencode(query), ""))
    except Exception:
        return value.lower()


def normalize_story_title(value: str) -> str:
    return " ".join("".join(char.lower() if char.isalnum() else " " for char in str(value or "")).split())


def current_story_identities(topic: dict, sources: list[dict], content_id: str) -> set[str]:
    identities = set()
    for url in [topic.get("selected", {}).get("url"), *[source.get("url") for source in sources]]:
        normalized = normalize_story_url(url)
        if normalized:
            identities.add(f"url:{normalized}")
    for title in [topic.get("selected", {}).get("title"), *[source.get("title") for source in sources]]:
        normalized = normalize_story_title(title)
        if normalized:
            identities.add(f"title:{normalized}")
    if content_id:
        identities.add(f"content:{normalize_story_title(content_id)}")
    return identities


def already_posted_same_story(run_date: str, slot: str, identities: set[str]) -> dict:
    if os.environ.get("UNA_ALLOW_REPOST") == "1":
        return {"duplicate": False, "reason": "repost override enabled"}
    for entry in reversed(load_ledger_entries()):
        if entry.get("dryRun"):
            continue
        if entry.get("runDate") == run_date and entry.get("slot", "news") == slot:
            continue
        posted = any(str(result.get("status", "")).startswith("posted") for result in (entry.get("results") or {}).values())
        if not posted and not str(entry.get("status", "")).startswith("posted"):
            continue
        previous = set()
        topic = entry.get("topic") or {}
        for url in [topic.get("url"), *[source.get("url") for source in entry.get("sources") or []]]:
            normalized = normalize_story_url(url)
            if normalized:
                previous.add(f"url:{normalized}")
        for title in [topic.get("title"), *[source.get("title") for source in entry.get("sources") or []]]:
            normalized = normalize_story_title(title)
            if normalized:
                previous.add(f"title:{normalized}")
        if entry.get("contentId"):
            previous.add(f"content:{normalize_story_title(entry.get('contentId'))}")
        overlap = identities.intersection(previous)
        if overlap:
            return {
                "duplicate": True,
                "reason": "This edition would reuse a story or evergreen topic from an earlier Una Labs post.",
                "previousRunId": entry.get("id"),
                "previousRunDate": entry.get("runDate"),
                "previousSlot": entry.get("slot", "news"),
                "matchingIdentities": sorted(overlap),
            }
    return {"duplicate": False, "reason": "no previously published story identities matched"}


def approved_image_paths(approval: dict) -> list[Path]:
    paths = []
    for slide in approval.get("slides") or []:
        asset_path = slide.get("assetPath") or ""
        if not asset_path:
            continue
        path = Path(asset_path)
        if not path.is_absolute():
            path = ROOT / path
        if path.exists():
            paths.append(path)
    return paths


def instagram_image_paths(run_date: str, asset_dir: Path, slot: str = "news", approval: dict | None = None) -> list[Path]:
    approved_paths = approved_image_paths(approval or {})
    if approved_paths:
        return approved_paths
    preview_dir = ROOT / "content" / "previews"
    if slot != "news":
        evergreen = [preview_dir / f"evergreen-tip-{run_date}-{slot}-slide-{index}.png" for index in range(1, 4)]
        if all(path.exists() for path in evergreen):
            return evergreen
    regional = [preview_dir / f"regional-news-preview-{run_date}-slide-{index}.png" for index in range(1, 4)]
    editorial = [preview_dir / f"editorial-news-preview-{run_date}-slide-{index}.png" for index in range(1, 4)]
    if all(path.exists() for path in regional):
        return regional
    if all(path.exists() for path in editorial):
        return editorial
    fallback = asset_dir / "instagram-card.png"
    if fallback.exists():
        return [fallback]
    raise RuntimeError(f"Instagram image not found. Tried regional carousel, editorial carousel, and {fallback}")


def linkedin_image_paths(run_date: str, slot: str = "news", approval: dict | None = None) -> list[Path]:
    approved_paths = approved_image_paths(approval or {})
    if approved_paths:
        return approved_paths
    preview_dir = ROOT / "content" / "previews"
    if slot != "news":
        evergreen = preview_dir / f"evergreen-tip-{run_date}-{slot}.png"
        if evergreen.exists():
            return [evergreen]
        evergreen_slide1 = preview_dir / f"evergreen-tip-{run_date}-{slot}-slide-1.png"
        if evergreen_slide1.exists():
            return [evergreen_slide1]
    contact = preview_dir / f"regional-news-preview-{run_date}.png"
    if contact.exists():
        return [contact]
    slide1 = preview_dir / f"regional-news-preview-{run_date}-slide-1.png"
    if slide1.exists():
        return [slide1]
    return []


def main() -> int:
    parser = argparse.ArgumentParser(description="Post Una Labs social content through the visible Fejiro Chrome window.")
    parser.add_argument("--date", default=today_eastern())
    parser.add_argument("--slot", default="news")
    parser.add_argument("--channels", default="instagram,linkedin")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    run_date = args.date
    key = draft_key(run_date, args.slot)
    draft_dir = ROOT / "content" / "drafts" / key
    asset_dir = ROOT / "content" / "assets" / run_date
    proof_dir = ROOT / "content" / "proof" / run_date
    if args.slot != "news":
        proof_dir = proof_dir / args.slot
    proof_dir.mkdir(parents=True, exist_ok=True)
    approval = assert_publish_approved(draft_dir, args.dry_run)

    topic = json.loads((draft_dir / "topic.json").read_text(encoding="utf-8"))
    sources_path = draft_dir / "sources.json"
    sources = []
    if sources_path.exists():
        try:
            sources = json.loads(sources_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            sources = []
    content_id = ((topic.get("evergreen") or {}).get("id") or topic.get("selected", {}).get("url") or "")
    approved_captions = approval.get("captions") or {}
    instagram_caption = (approved_captions.get("instagram") or (draft_dir / "instagram-caption.md").read_text(encoding="utf-8")).strip()
    linkedin_post = (approved_captions.get("linkedin") or (draft_dir / "linkedin-post.md").read_text(encoding="utf-8")).strip()
    image_paths = instagram_image_paths(run_date, asset_dir, args.slot, approval)
    linkedin_images = linkedin_image_paths(run_date, args.slot, approval)
    instagram_asset_proof = approval_asset_proof(approval, image_paths)
    linkedin_asset_proof = approval_asset_proof(approval, linkedin_images)

    if "instagram" in [item.strip().lower() for item in args.channels.split(",") if item.strip()]:
        caption_issues = validate_instagram_caption(instagram_caption)
        if caption_issues:
            raise RuntimeError("Instagram caption preflight failed: " + " ".join(caption_issues))

    channels = [item.strip().lower() for item in args.channels.split(",") if item.strip()]
    story_duplicate = already_posted_same_story(
        run_date,
        args.slot,
        current_story_identities(topic, sources, content_id),
    )
    with VisibleBrowserLock():
        results = {}
        if story_duplicate.get("duplicate"):
            for channel in channels:
                results[channel] = {
                    "channel": channel,
                    "status": "blocked_duplicate_story",
                    "reason": story_duplicate["reason"],
                    "details": story_duplicate,
                }
        if "instagram" in channels and not story_duplicate.get("duplicate"):
            window = find_chrome_window("instagram")
            window.set_focus()
            duplicate = already_posted_same_images(run_date, args.slot, "instagram", instagram_asset_proof)
            if duplicate.get("duplicate"):
                results["instagram"] = {
                    "channel": "instagram",
                    "status": "blocked_duplicate_asset",
                    "reason": duplicate["reason"],
                    "assetProof": instagram_asset_proof,
                    "details": duplicate,
                }
            else:
                results["instagram"] = publish_instagram(window, run_date, image_paths, instagram_caption, proof_dir, args.dry_run)
                results["instagram"].setdefault("assetProof", {})
                results["instagram"]["assetProof"].update(instagram_asset_proof)
        if "linkedin" in channels and not story_duplicate.get("duplicate"):
            window = find_chrome_window("linkedin")
            window.set_focus()
            duplicate = already_posted_same_images(run_date, args.slot, "linkedin", linkedin_asset_proof)
            if duplicate.get("duplicate"):
                results["linkedin"] = {
                    "channel": "linkedin",
                    "status": "blocked_duplicate_asset",
                    "reason": duplicate["reason"],
                    "assetProof": linkedin_asset_proof,
                    "details": duplicate,
                }
            else:
                results["linkedin"] = publish_linkedin(window, linkedin_post, linkedin_images, proof_dir, args.dry_run)
                results["linkedin"].setdefault("assetProof", {})
                results["linkedin"]["assetProof"].update(linkedin_asset_proof)

    statuses = [item.get("status") for item in results.values()]
    if args.dry_run:
        status = "dry_run_ready" if statuses and all(s == "dry_run_ready" for s in statuses) else "dry_run_blocked"
    else:
        status = "posted_unverified" if statuses and all(str(s).startswith("posted") for s in statuses) else "publish_blocked"

    report = {
        "id": f"una-social-visible-{run_date}-{int(time.time())}",
        "runDate": run_date,
        "slot": args.slot,
        "contentId": content_id,
        "draftKey": key,
        "mode": "visible_chrome",
        "status": status,
        "dryRun": args.dry_run,
        "channels": channels,
        "topic": {
            "title": topic.get("selected", {}).get("title"),
            "url": topic.get("selected", {}).get("url"),
            "sourceName": topic.get("selected", {}).get("sourceName"),
        },
        "sources": sources,
        "results": results,
        "proofDir": str(proof_dir.resolve()),
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    report_name = f"visible-social-post-report-{int(time.time())}.json"
    report_path = proof_dir / report_name
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    (proof_dir / "visible-social-post-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not args.dry_run:
        append_ledger(report)
    print(json.dumps(report, indent=2))
    return 0 if status in ("dry_run_ready", "posted_unverified") else 1


if __name__ == "__main__":
    raise SystemExit(main())
