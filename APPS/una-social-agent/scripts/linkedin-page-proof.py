import argparse
import json
import time
from pathlib import Path

import pyperclip
from pywinauto import Desktop, keyboard


ROOT = Path(__file__).resolve().parents[1]


LINKEDIN_DASHBOARD_URL = "https://www.linkedin.com/company/112328320/admin/dashboard/"


LINKEDIN_ROUTES = {
    "dashboard": LINKEDIN_DASHBOARD_URL,
    "edit_page": LINKEDIN_DASHBOARD_URL,
    "services": LINKEDIN_DASHBOARD_URL,
    "member_view": LINKEDIN_DASHBOARD_URL,
}


ROUTE_CLICKS = {
    "edit_page": "Edit Page",
    "services": "Add services",
    "member_view": "View as member",
}


def today_eastern() -> str:
    return time.strftime("%Y-%m-%d")


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
    for window in candidates:
        title = (window.window_text() or "").lower()
        if "linkedin" in title or "una labs" in title:
            return window
    return candidates[0]


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


def navigate(window, url: str, wait: float):
    window.set_focus()
    old_clipboard = pyperclip.paste()
    try:
        keyboard.send_keys("{ESC}")
        time.sleep(0.2)
        pyperclip.copy(url)
        keyboard.send_keys("^l")
        time.sleep(0.2)
        keyboard.send_keys("^v")
        keyboard.send_keys("{ENTER}")
        time.sleep(wait)
    finally:
        pyperclip.copy(old_clipboard)


def screenshot(window, file_path: Path) -> str:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    window.capture_as_image().save(file_path)
    return str(file_path.resolve())


def click_visible_text(window, label: str) -> bool:
    matches = []
    for control in window.descendants():
        try:
            text = (control.window_text() or "").strip()
        except Exception:
            continue
        if text == label:
            matches.append(control)
    for control in matches:
        try:
            control.click_input()
            return True
        except Exception:
            continue
    return False


def capture_route(window, label: str, url: str, proof_dir: Path, wait: float):
    navigate(window, url, wait)
    clicked = None
    if label in ROUTE_CLICKS:
        clicked = click_visible_text(window, ROUTE_CLICKS[label])
        time.sleep(wait)
    image_path = screenshot(window, proof_dir / f"linkedin-page-{label}.png")
    text_path = proof_dir / f"linkedin-page-{label}.txt"
    text = visible_text(window)
    text_path.write_text(text, encoding="utf-8")
    return {
        "label": label,
        "url": url,
        "clicked": clicked,
        "clickedLabel": ROUTE_CLICKS.get(label),
        "screenshot": image_path,
        "text": str(text_path.resolve()),
        "textPreview": text[:2000],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=today_eastern())
    parser.add_argument("--wait", type=float, default=5.0)
    parser.add_argument(
        "--routes",
        nargs="*",
        default=["dashboard", "edit_page", "services", "member_view"],
        choices=sorted(LINKEDIN_ROUTES.keys()),
    )
    args = parser.parse_args()

    proof_dir = ROOT / "content" / "proof" / args.date / "linkedin-page"
    window = find_chrome_window()
    captures = []
    for label in args.routes:
        captures.append(capture_route(window, label, LINKEDIN_ROUTES[label], proof_dir, args.wait))

    report = {
        "id": f"linkedin-page-proof-{args.date}-{int(time.time())}",
        "runDate": args.date,
        "status": "captured",
        "routes": captures,
        "proofDir": str(proof_dir.resolve()),
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    report_path = proof_dir / "linkedin-page-proof-report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
