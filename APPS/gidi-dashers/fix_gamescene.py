from pathlib import Path

gs = Path(r"C:\FTC HOLDING\APPS\gidi-dashers\src\scenes\GameScene.ts")
tail_path = Path(r"C:\FTC HOLDING\APPS\gidi-dashers\__tail.ts")

all_lines = gs.read_text(encoding="utf-8").splitlines(keepends=True)
head = all_lines[:384]

tail = tail_path.read_text(encoding="utf-8-sig")
tail = tail.replace("strokeLine(", "lineBetween(")

out = "".join(head) + tail
if not out.endswith("\n"):
    out += "\n"

gs.write_text(out, encoding="utf-8", newline="\n")
print("wrote", gs)
print("lines", len(out.splitlines()))
