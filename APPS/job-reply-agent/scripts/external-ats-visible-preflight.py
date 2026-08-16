from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import ImageGrab

from visible_chrome_dom_dump import find_chrome_window


GATE_TERMS = {
    "recaptcha": "reCAPTCHA",
    "hcaptcha": "hCaptcha",
    "turnstile": "Cloudflare Turnstile",
    "i'm not a robot": "human-verification checkbox",
    "prove you are human": "human-verification challenge",
    "security verification": "security-verification challenge",
}


def current_page_text(window) -> str:
    bounds = window.rectangle()
    content_top = bounds.top + 95
    values: list[str] = []
    for control in window.descendants():
        try:
            rect = control.rectangle()
            if rect.bottom <= content_top or rect.top >= bounds.bottom:
                continue
            if rect.right <= bounds.left or rect.left >= bounds.right:
                continue
            text = control.window_text().strip()
            if text:
                values.append(text)
        except Exception:
            continue
    return "\n".join(values)


def current_url(window) -> str:
    for control in window.descendants():
        try:
            if control.element_info.control_type != "Edit":
                continue
            value = control.window_text().strip()
            if value.startswith(("http://", "https://")):
                return value
            if "." in value and " " not in value:
                return f"https://{value}"
        except Exception:
            continue
    return ""


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check visible Fejiro Chrome for a human-verification gate before an external ATS submit."
    )
    parser.add_argument("--screenshot", type=Path)
    args = parser.parse_args()

    window = find_chrome_window()
    rect = window.rectangle()
    visible_browser = rect.width() > 0 and rect.height() > 0
    text = current_page_text(window)
    lowered = text.lower()
    indicators = sorted({label for term, label in GATE_TERMS.items() if term in lowered})

    screenshot = ""
    if args.screenshot and visible_browser:
        args.screenshot.parent.mkdir(parents=True, exist_ok=True)
        ImageGrab.grab(
            bbox=(rect.left, rect.top, rect.right, rect.bottom),
            all_screens=True,
        ).save(args.screenshot)
        screenshot = str(args.screenshot.resolve())

    result = {
        "ok_to_submit_automatically": visible_browser and not indicators,
        "visible_browser": visible_browser,
        "url": current_url(window),
        "title": window.window_text(),
        "human_gate_indicators": indicators,
        "screenshot": screenshot,
        "next_action": (
            "restore_visible_browser"
            if not visible_browser
            else (
                "pause_and_preserve_checkpoint"
                if indicators
                else "continue_single_submit_attempt"
            )
        ),
    }
    print(json.dumps(result, indent=2))
    if not visible_browser:
        return 3
    return 2 if indicators else 0


if __name__ == "__main__":
    sys.exit(main())
