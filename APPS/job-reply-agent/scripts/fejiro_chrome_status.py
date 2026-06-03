from pathlib import Path

from pywinauto import Desktop


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

    preferred = None
    for window in windows:
        title = window.window_text()
        if "Fejiro" in title or "Dice" in title or "dice.com" in title:
            preferred = window
            break

    preferred = preferred or windows[0]
    title = preferred.window_text()
    rect = preferred.rectangle()
    screenshot = out_dir / "fejiro-visible-chrome-status.png"
    preferred.capture_as_image().save(screenshot)

    print(f"Visible Chrome title: {title}")
    print(f"Window rectangle: left={rect.left} top={rect.top} right={rect.right} bottom={rect.bottom}")
    print(f"Screenshot: {screenshot.resolve()}")
    print("No browser was launched and no navigation was performed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
