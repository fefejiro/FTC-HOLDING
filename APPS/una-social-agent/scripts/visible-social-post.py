import argparse
import json
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

    fejiro = []
    for window in candidates:
        label = profile_label(window).lower()
        title = (window.window_text() or "").lower()
        if "fejiro" in label or "linkedin" in title or "instagram" in title:
            fejiro.append(window)

    return fejiro[0] if fejiro else candidates[0]


def screenshot(window, file_path: Path):
    file_path.parent.mkdir(parents=True, exist_ok=True)
    window.capture_as_image().save(file_path)
    return str(file_path.resolve())


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
            click_text_fallback(window, "Leave")
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
    window.set_focus()
    time.sleep(0.2)
    keyboard.send_keys("^l")
    time.sleep(0.15)
    keyboard.send_keys("javascript:")
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
    win = window.rectangle()
    x = int(win.left + rect["x"] + rect["width"] / 2)
    y = int(win.top + rect["y"] + rect["height"] / 2)
    mouse.click(button="left", coords=(x, y))
    time.sleep(wait)
    return {"ok": True, "coords": [x, y], "rect": rect}


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
  target.el.scrollIntoView({ block: 'center', inline: 'center' });
  target.el.focus();
  setTimeout(() => {
    const rect = target.el.getBoundingClientRect();
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
    win = window.rectangle()
    x = int(win.left + rect["x"] + rect["width"] / 2)
    y = int(win.top + rect["y"] + rect["height"] / 2)
    mouse.click(button="left", coords=(x, y))
    time.sleep(wait)
    return {"ok": True, "coords": [x, y], "rect": rect}


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
                if class_name in ("#32770", "CabinetWClass") or "open" in lowered or "choose" in lowered or "upload" in lowered:
                    return candidate, title
    return None, ""


def fill_file_picker(picker, file_path: Path):
    picker.set_focus()
    time.sleep(0.3)
    old = set_clipboard_temporarily(str(file_path.resolve()))
    try:
        keyboard.send_keys("%n")
        time.sleep(0.2)
        keyboard.send_keys("^a")
        keyboard.send_keys("^v")
        keyboard.send_keys("{ENTER}")
        time.sleep(1.5)
    finally:
        restore_clipboard(old)


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


def click_relative(window, x_ratio: float, y_ratio: float, wait: float = 0.8) -> list[int]:
    rect = window.rectangle()
    x = rect.left + int(rect.width() * x_ratio)
    y = rect.top + int(rect.height() * y_ratio)
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
    detail = {"steps": []}
    navigate(window, "https://www.linkedin.com/company/112328320/admin/page-posts/published/", 5)
    detail["steps"].append({"action": "navigate_page_posts"})
    detail["page_posts"] = screenshot(window, proof_dir / "visible-linkedin-page-posts.png")

    text = visible_text(window)
    if "Sign in" in text and "Password" in text:
        return {"ok": False, "reason": "LinkedIn login form is visible.", **detail}

    if not linkedin_composer_is_open(window):
        if "Start a post" in text:
            if not (click_text_fallback(window, "Start a post") or click_dom(window, r"Start a post", 1.2).get("ok")):
                coords = click_relative(window, 0.50, 0.41, 1.2)
                detail["steps"].append({"action": "coordinate_start_post", "coords": coords})
            else:
                detail["steps"].append({"action": "clicked_start_post_by_text"})
            if not linkedin_composer_is_open(window):
                coords = click_relative(window, 0.50, 0.41, 1.5)
                detail["steps"].append({"action": "coordinate_start_post_after_soft_click", "coords": coords})
        else:
            navigate(window, "https://www.linkedin.com/company/112328320/admin/dashboard/", 4)
            detail["dashboard"] = screenshot(window, proof_dir / "visible-linkedin-home.png")
            coords = click_relative(window, 0.21, 0.42, 1.2)
            detail["steps"].append({"action": "dashboard_create", "coords": coords})
            if "Start a post" in visible_text(window):
                if not (click_text_fallback(window, "Start a post") or click_dom(window, r"Start a post", 1.0).get("ok")):
                    coords = click_relative(window, 0.57, 0.56, 1.0)
                    detail["steps"].append({"action": "coordinate_start_post_after_create", "coords": coords})

    time.sleep(1.5)
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
    paste_text(window, post)
    time.sleep(1.2)
    detail["post_filled"] = screenshot(window, proof_dir / "visible-linkedin-post-filled.png")
    text = visible_text(window)
    title = post.splitlines()[0].strip()
    if title not in text:
        detail["post_not_visible"] = screenshot(window, proof_dir / "visible-linkedin-post-text-missing.png")
        return {"ok": False, "reason": "LinkedIn composer text was not visible after paste.", **detail}
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


def verify_linkedin_post(window, post: str, proof_dir: Path) -> dict:
    title = post.splitlines()[0].strip()
    navigate(window, "https://www.linkedin.com/company/112328320/admin/page-posts/published/", 5)
    proof = screenshot(window, proof_dir / "visible-linkedin-posts-verify.png")
    text = visible_text(window)
    if title in text:
        return {"ok": True, "proof": proof, "reason": "New LinkedIn post text is visible on Page posts."}
    return {"ok": False, "proof": proof, "reason": "Page posts proof did not show today's LinkedIn post text."}


def publish_instagram(window, run_date: str, image_path: Path, caption: str, proof_dir: Path, dry_run: bool) -> dict:
    result = {"channel": "instagram", "status": "started", "proof": {}, "url": ""}
    navigate(window, "https://www.instagram.com/", 5)
    result["proof"]["home"] = screenshot(window, proof_dir / "visible-instagram-home.png")
    text = visible_text(window)
    if "Log in" in text and "Password" in text:
        result.update(status="blocked_needs_login", reason="Instagram login form is visible.")
        return result

    rect = window.rectangle()
    create_x = rect.left + 46
    create_y = rect.top + int(rect.height() * 0.60)
    mouse.click(button="left", coords=(create_x, create_y))
    time.sleep(1.8)
    click = {"ok": True, "reason": "clicked visible Instagram sidebar create button", "coords": [create_x, create_y]}
    if "Create new post" not in visible_text(window) and "Select from computer" not in visible_text(window):
        click_relative(window, 0.038, 0.60, 1.0)
        fallback_click = click_instagram_create(window, 1.5)
        if not fallback_click.get("ok"):
            click_text_fallback(window, "Create") or click_dom(window, r"^Create$", 1.0)
        click["fallback"] = fallback_click
    time.sleep(1.0)
    picker = None
    picker_title = ""
    for attempt in range(3):
        before = current_window_handles()
        page_text = visible_text(window)
        if "Select from computer" in page_text:
            clicked = click_text_fallback(window, "Select from computer")
            if not clicked:
                clicked = bool(click_dom(window, r"Select from computer", 0.8).get("ok"))
            if not clicked:
                click_relative(window, 0.50, 0.64, 0.8)
        elif "Create new post" in page_text:
            click_relative(window, 0.50, 0.64, 0.8)
        else:
            click_text_fallback(window, "Create") or click_instagram_create(window, 1.0)
        picker, picker_title = find_file_picker(before, 6)
        if picker:
            break
    if not picker:
        result.update(status="blocked_no_file_picker", reason="Instagram file picker did not open.", clickCreate=click)
        result["proof"]["error"] = screenshot(window, proof_dir / "visible-instagram-error.png")
        return result

    fill_file_picker(picker, image_path)
    time.sleep(3)
    result["proof"]["image_selected"] = screenshot(window, proof_dir / "visible-instagram-image-selected.png")

    for _ in range(3):
        if "Next" in visible_text(window):
            click_text_fallback(window, "Next") or click_dom(window, r"^Next$", 1.2)
            time.sleep(1.2)

    if "Write a caption" in visible_text(window) or "Add a caption" in visible_text(window):
        click_dom(window, r"Write a caption|Add a caption", 0.5)
    # Instagram's caption box often exposes little useful UIA text. Click the
    # visible right-side composer area before paste so we do not silently post
    # an image with an empty caption.
    click_relative(window, 0.66, 0.35, 0.3)
    paste_text(window, caption)
    time.sleep(1)
    result["proof"]["caption_filled"] = screenshot(window, proof_dir / "visible-instagram-caption-filled.png")

    if caption.splitlines()[0].strip() not in visible_text(window):
        result.update(status="blocked_caption_not_filled", reason="Instagram caption was not visible after paste.")
        result["proof"]["error"] = screenshot(window, proof_dir / "visible-instagram-caption-missing.png")
        return result

    if dry_run:
        result.update(status="dry_run_ready", reason="Instagram image and caption reached the share step.")
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


def publish_linkedin(window, post: str, proof_dir: Path, dry_run: bool) -> dict:
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

    if dry_run:
        result.update(status="dry_run_ready", reason="LinkedIn post composer reached with text filled.")
        return result

    posted = click_linkedin_post_button(window, proof_dir)
    result["proof"].update({k: v for k, v in posted.items() if isinstance(v, str) and k not in ("reason",)})
    if not posted.get("ok"):
        result.update(status="blocked_no_post_button", reason=posted.get("reason", "LinkedIn Post button not found."), details=posted)
        return result

    verify = verify_linkedin_post(window, post, proof_dir)
    result["proof"]["posts_verify"] = verify["proof"]
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


def main() -> int:
    parser = argparse.ArgumentParser(description="Post Una Labs social content through the visible Fejiro Chrome window.")
    parser.add_argument("--date", default=today_eastern())
    parser.add_argument("--channels", default="instagram,linkedin")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    run_date = args.date
    draft_dir = ROOT / "content" / "drafts" / run_date
    asset_dir = ROOT / "content" / "assets" / run_date
    proof_dir = ROOT / "content" / "proof" / run_date
    proof_dir.mkdir(parents=True, exist_ok=True)

    topic = json.loads((draft_dir / "topic.json").read_text(encoding="utf-8"))
    instagram_caption = (draft_dir / "instagram-caption.md").read_text(encoding="utf-8").strip()
    linkedin_post = (draft_dir / "linkedin-post.md").read_text(encoding="utf-8").strip()
    image_path = asset_dir / "instagram-card.png"
    if not image_path.exists():
        raise RuntimeError(f"Instagram image not found: {image_path}")

    channels = [item.strip().lower() for item in args.channels.split(",") if item.strip()]
    with VisibleBrowserLock():
        window = find_chrome_window()
        window.set_focus()
        results = {}
        if "instagram" in channels:
            results["instagram"] = publish_instagram(window, run_date, image_path, instagram_caption, proof_dir, args.dry_run)
        if "linkedin" in channels:
            results["linkedin"] = publish_linkedin(window, linkedin_post, proof_dir, args.dry_run)

    statuses = [item.get("status") for item in results.values()]
    if args.dry_run:
        status = "dry_run_ready" if statuses and all(s == "dry_run_ready" for s in statuses) else "dry_run_blocked"
    else:
        status = "posted_unverified" if statuses and all(str(s).startswith("posted") for s in statuses) else "publish_blocked"

    report = {
        "id": f"una-social-visible-{run_date}-{int(time.time())}",
        "runDate": run_date,
        "mode": "visible_chrome",
        "status": status,
        "dryRun": args.dry_run,
        "channels": channels,
        "topic": {
            "title": topic.get("selected", {}).get("title"),
            "url": topic.get("selected", {}).get("url"),
            "sourceName": topic.get("selected", {}).get("sourceName"),
        },
        "results": results,
        "proofDir": str(proof_dir.resolve()),
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    report_path = proof_dir / "visible-social-post-report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not args.dry_run:
        append_ledger(report)
    print(json.dumps(report, indent=2))
    return 0 if status in ("dry_run_ready", "posted_unverified") else 1


if __name__ == "__main__":
    raise SystemExit(main())
