from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]


def load_font(path: str, size: int):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def main() -> int:
    out_dir = ROOT / "content" / "assets" / "linkedin-page"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "unalabs-linkedin-banner-2026-07-16.png"

    width, height = 1128, 191
    bg = "#071C22"
    teal = "#4DB8A8"
    orange = "#FF3D00"
    cream = "#F5F2EA"
    muted = "#93A8A4"

    img = Image.new("RGB", (width, height), bg)
    draw = ImageDraw.Draw(img)

    for x in range(-40, width + 80, 42):
        y0 = 134 + int(math.sin(x / 68) * 18)
        draw.line([(x, y0), (x + 80, y0 - 12)], fill="#12343A", width=2)

    for x in range(0, width, 72):
        y = 20 + (x % 5) * 6
        draw.ellipse((x, y, x + 3, y + 3), fill="#1E4C51")

    panel = Image.new("RGBA", (330, 150), (0, 0, 0, 0))
    panel_draw = ImageDraw.Draw(panel)
    for y, color, bar_width in [(22, teal, 190), (58, cream, 145), (94, orange, 88)]:
        panel_draw.rounded_rectangle((35, y, 35 + bar_width, y + 8), radius=4, fill=color)
        panel_draw.rounded_rectangle((35, y + 18, 245, y + 23), radius=3, fill=(245, 242, 234, 120))
    panel_draw.rounded_rectangle((18, 10, 285, 132), radius=18, outline=(77, 184, 168, 130), width=2)
    panel = panel.filter(ImageFilter.GaussianBlur(0.1))
    img.paste(panel, (800, 24), panel)

    center_x, center_y = 74, 78
    petals = [
        (0, -24, teal),
        (22, -7, "#F4C542"),
        (14, 21, orange),
        (-14, 21, "#59606A"),
        (-22, -7, "#37A88F"),
    ]
    for dx, dy, color in petals:
        draw.ellipse(
            (center_x + dx - 18, center_y + dy - 18, center_x + dx + 18, center_y + dy + 18),
            fill=color,
            outline=cream,
            width=2,
        )
    draw.ellipse((center_x - 9, center_y - 9, center_x + 9, center_y + 9), fill=cream)

    bold = load_font(r"C:\Windows\Fonts\arialbd.ttf", 34)
    body = load_font(r"C:\Windows\Fonts\arial.ttf", 21)
    small_bold = load_font(r"C:\Windows\Fonts\arialbd.ttf", 16)
    small = load_font(r"C:\Windows\Fonts\arial.ttf", 15)

    draw.text((126, 48), "Una Labs", fill=cream, font=bold)
    draw.text((126, 91), "AI workflow systems + source-backed tech briefings", fill=teal, font=body)
    draw.text((126, 126), "Practical automation. Clear signals. Proof before trust.", fill=muted, font=small)

    x = 126
    for label, color in [("AI WORKFLOW", teal), ("AUTOMATION", orange), ("TECH NEWS", cream)]:
        text_width = draw.textlength(label, font=small_bold)
        draw.rounded_rectangle((x - 11, 152, x + text_width + 11, 178), radius=13, outline=color, width=1)
        draw.text((x, 156), label, fill=color, font=small_bold)
        x += int(text_width) + 42

    draw.text((933, 156), "unalabs.cloud", fill=cream, font=small_bold)
    img.save(out, quality=95)
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
