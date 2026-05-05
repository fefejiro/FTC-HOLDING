from pathlib import Path

pre = Path(r"C:\FTC HOLDING\APPS\gidi-dashers\src\scenes\PreloadScene.ts")
text = pre.read_text(encoding="utf-8")
marker = "    export class PreloadScene extends Phaser.Scene {"
pos = text.find(marker)
if pos == -1:
    raise SystemExit("Nested premium class marker not found")

body = text[pos:]
lines = body.splitlines()
lines = [ln[4:] if ln.startswith("    ") else ln for ln in lines]
clean = "\n".join(lines) + "\n"

if clean.startswith("export class PreloadScene"):
    clean = "import Phaser from 'phaser';\nimport { COLORS } from '../config';\n\n" + clean

clean = clean.replace("strokeLine(", "lineBetween(")
pre.write_text(clean, encoding="utf-8", newline="\n")
print("rewritten", pre)
print("lines", len(clean.splitlines()))
