import argparse
import json
import time
from pathlib import Path

import pyperclip
from pywinauto import Desktop, keyboard


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
  const candidates = [...document.querySelectorAll('button,a,input[type="button"],input[type="submit"]')];
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


def run_dom_dump(window, wait_seconds: float) -> dict:
    # Chrome strips pasted javascript: URLs. Type the prefix, paste the payload.
    payload = r"""(() => {
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const links = [...document.querySelectorAll('a[href]')].map((a) => ({
    text: clean(a.innerText || a.textContent || a.getAttribute('aria-label') || ''),
    href: a.href || ''
  })).filter((item) => item.text || item.href).slice(0, 500);
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
    parser.add_argument("--click-wait", type=float, default=5.0)
    parser.add_argument("--leave-dump-page", action="store_true", help="Leave the tab on the copied JSON dump page instead of restoring the captured URL.")
    parser.add_argument("--no-dump", action="store_true", help="Navigate/click/screenshot only; do not replace the page with a DOM dump.")
    args = parser.parse_args()

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    window = find_chrome_window()
    before_title = window.window_text()
    navigate_current_tab(window, args.url, args.wait)
    if args.click_apply:
        click_apply_control(window, args.click_wait)
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
    out.write_text(json.dumps(data, indent=2), encoding="utf-8")
    if not args.leave_dump_page and data.get("url"):
        navigate_current_tab(window, data["url"], 1.0)
    print(f"Wrote DOM dump: {out.resolve()}")
    print(f"Visible Chrome title before: {before_title}")
    print(f"Visible Chrome title after navigation: {after_title}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
