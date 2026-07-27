import json
import subprocess
import time
from pathlib import Path

import pyperclip
from pywinauto import Desktop, keyboard


ROOT = Path(__file__).resolve().parents[1]


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
        if "instagram" in title or "linkedin" in title or "una" in title:
            return window
    return candidates[0]


def navigate(window, url: str, wait: float = 5.0):
    window.set_focus()
    old = pyperclip.paste()
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
        pyperclip.copy(old)


def open_url(url: str, wait: float = 5.0):
    subprocess.Popen(["cmd", "/c", "start", "", url], shell=False)
    time.sleep(wait)


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


def screenshot(window, file_path: Path) -> str:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    window.capture_as_image().save(file_path)
    return str(file_path.resolve())


def append_ledger(entry: dict):
    ledger = ROOT / "content" / "ledger" / "engagement-ledger.jsonl"
    ledger.parent.mkdir(parents=True, exist_ok=True)
    with ledger.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def close_download_windows():
    for window in Desktop(backend="uia").windows():
        try:
            text = visible_text(window).lower()
            if "downloading" in text and "items remaining" in text:
                window.close()
        except Exception:
            pass


def main() -> int:
    run_date = today_eastern()
    proof_dir = ROOT / "content" / "proof" / run_date / "engagement"
    close_download_windows()
    window = find_chrome_window()

    results = {}
    navigate(window, "https://www.instagram.com/unalabs.cloud/", 5)
    results["instagram"] = {
        "url": "https://www.instagram.com/unalabs.cloud/",
        "proof": screenshot(window, proof_dir / "instagram-profile.png"),
        "visibleText": visible_text(window)[:5000],
    }

    open_url("https://www.linkedin.com/company/112328320/admin/page-posts/published/", 6)
    close_download_windows()
    window = find_chrome_window()
    results["linkedin"] = {
        "url": "https://www.linkedin.com/company/112328320/admin/page-posts/published/",
        "proof": screenshot(window, proof_dir / "linkedin-page-posts.png"),
        "visibleText": visible_text(window)[:5000],
    }

    report = {
        "id": f"una-social-engagement-{run_date}-{int(time.time())}",
        "runDate": run_date,
        "mode": "visible_chrome",
        "status": "captured",
        "results": results,
        "proofDir": str(proof_dir.resolve()),
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    report_path = proof_dir / "engagement-report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    append_ledger(report)
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
