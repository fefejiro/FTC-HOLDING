from pathlib import Path

from pywinauto import Desktop


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


def main() -> int:
    out_dir = Path(".local/dice-debug")
    out_dir.mkdir(parents=True, exist_ok=True)

    windows = []
    for window in Desktop(backend="uia").windows():
        try:
            title = window.window_text()
            class_name = window.class_name()
        except Exception:
            continue

        if class_name != "Chrome_WidgetWin_1":
            continue
        if not title or "Google Chrome" not in title:
            continue

        windows.append(window)

    if not windows:
        print("No visible Google Chrome window found.")
        return 1

    fejiro_windows = [window for window in windows if is_fejiro_profile(window)]
    if not fejiro_windows:
        print("No visible Fejiro Chrome profile window found.")
        for window in windows:
            print(f"- {window.window_text()} [profile={profile_label(window) or 'unknown'}]")
        return 1

    preferred = None
    for window in fejiro_windows:
        title = window.window_text()
        if "Fejiro" in title or "Dice" in title or "dice.com" in title:
            preferred = window
            break

    preferred = preferred or fejiro_windows[0]
    title = preferred.window_text()
    label = profile_label(preferred) or "unknown"
    rect = preferred.rectangle()
    screenshot = out_dir / "fejiro-visible-chrome-status.png"
    screenshot_status = ""
    try:
        image = preferred.capture_as_image()
        if image is None:
            screenshot_status = "Screenshot capture returned no image."
        else:
            image.save(screenshot)
            screenshot_status = f"Screenshot: {screenshot.resolve()}"
    except Exception as exc:
        screenshot_status = f"Screenshot capture skipped: {exc}"

    print(f"Visible Chrome title: {title}")
    print(f"Visible Chrome profile: {label}")
    print(f"Window rectangle: left={rect.left} top={rect.top} right={rect.right} bottom={rect.bottom}")
    print(screenshot_status)
    print("No browser was launched and no navigation was performed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
