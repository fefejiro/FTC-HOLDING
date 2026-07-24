import argparse
import os
import re
from pathlib import Path

from pywinauto import Desktop


ROOT = Path(__file__).resolve().parents[1]


def manifest_value(text: str, key: str) -> str:
    match = re.search(rf"(?m)^{re.escape(key)}:\s*(.*?)\s*$", text)
    return (match.group(1).strip().strip("\"'") if match else "")


def profile_label(window) -> str:
    try:
        for button in window.descendants(control_type="Button"):
            try:
                text = button.window_text() or ""
                automation_id = button.get_properties().get("automation_id") or ""
            except Exception:
                continue
            if automation_id == "view_1018" and text:
                return text.strip()
    except Exception:
        return ""
    return ""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--instance", default=os.environ.get("JOB_AGENT_INSTANCE_ID", ""))
    args = parser.parse_args()
    instance_id = args.instance.strip().lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{1,31}", instance_id):
        print("A valid --instance is required.")
        return 2

    manifest = ROOT / "instances" / instance_id / "instance.yaml"
    if not manifest.exists():
        print(f"Unknown instance: {instance_id}")
        return 2
    manifest_text = manifest.read_text(encoding="utf-8")
    candidate = manifest_value(manifest_text, "candidate_name")
    expected_mailbox = manifest_value(manifest_text, "expected_gmail_account")
    if not candidate or re.search(r"pending|unknown|tbd", candidate, re.I):
        print(f"Instance '{instance_id}' has no approved candidate name.")
        return 2

    expected_tokens = {instance_id, candidate.lower(), candidate.split()[0].lower()}
    windows = []
    for window in Desktop(backend="uia").windows():
        try:
            if window.class_name() == "Chrome_WidgetWin_1" and "Google Chrome" in window.window_text():
                windows.append(window)
        except Exception:
            continue

    matches = []
    for window in windows:
        label = profile_label(window).lower()
        if label and any(token in label for token in expected_tokens):
            matches.append(window)

    if not matches:
        print(f"No visible Chrome profile matched instance '{instance_id}' ({candidate}).")
        for window in windows:
            print(f"- {window.window_text()} [profile={profile_label(window) or 'unknown'}]")
        return 1

    selected = matches[0]
    proof_dir = ROOT / "instances" / instance_id / "proof"
    proof_dir.mkdir(parents=True, exist_ok=True)
    screenshot = proof_dir / "visible-chrome-status.png"
    image = selected.capture_as_image()
    if image is not None:
        image.save(screenshot)
    rect = selected.rectangle()
    print(f"Instance: {instance_id}")
    print(f"Candidate: {candidate}")
    print(f"Expected mailbox: {expected_mailbox}")
    print(f"Visible Chrome title: {selected.window_text()}")
    print(f"Visible Chrome profile: {profile_label(selected)}")
    print(f"Window rectangle: left={rect.left} top={rect.top} right={rect.right} bottom={rect.bottom}")
    if image is not None:
        print(f"Screenshot: {screenshot}")
    else:
        print("Screenshot capture unavailable; identity match remains verified.")
    print("No browser was launched and no navigation was performed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
