"""Genera los íconos PWA y las imágenes de referencia del seed.

Uso: python3 scripts/generate-assets.py
Requiere Pillow. Las imágenes son provisorias: el equipo de Enfermería debe
reemplazar los archivos de /public/uploads por el material definitivo.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "public" / "icons"
UPLOADS = ROOT / "public" / "uploads"

BORDO = (138, 30, 60)
BORDO_DARK = (110, 23, 48)
WHITE = (255, 255, 255)
NAVY = (27, 53, 88)
MUTED = (241, 243, 246)
BORDER = (214, 221, 230)
TEXT = (55, 65, 81)
SUBTLE = (107, 118, 133)

ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def draw_cross(draw: ImageDraw.ImageDraw, size: int, inset: float, color=WHITE) -> None:
    """Cruz de salud centrada, con brazos redondeados."""
    arm = size * (1 - inset * 2)
    thickness = arm * 0.3
    center = size / 2
    start = center - arm / 2
    end = center + arm / 2
    draw.rounded_rectangle(
        [center - thickness / 2, start, center + thickness / 2, end],
        radius=thickness / 2,
        fill=color,
    )
    draw.rounded_rectangle(
        [start, center - thickness / 2, end, center + thickness / 2],
        radius=thickness / 2,
        fill=color,
    )


def make_icon(size: int, maskable: bool) -> Image.Image:
    image = Image.new("RGBA", (size, size), BORDO)
    draw = ImageDraw.Draw(image)

    if not maskable:
        margin = round(size * 0.055)
        draw.rounded_rectangle(
            [margin, margin, size - margin, size - margin],
            radius=round(size * 0.22),
            fill=BORDO_DARK,
        )

    draw_cross(draw, size, inset=0.3 if maskable else 0.24)
    return image


def make_placeholder(name: str, title: str, subtitle: str) -> None:
    width, height = 1200, 800
    image = Image.new("RGB", (width, height), MUTED)
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle(
        [32, 32, width - 32, height - 32],
        radius=28,
        fill=(250, 251, 252),
        outline=BORDER,
        width=3,
    )

    # Cruz de referencia.
    draw.rounded_rectangle([72, 72, 184, 184], radius=26, fill=BORDO)
    draw_cross(draw, 256, inset=0.37)
    # La cruz queda centrada en el cuadrado completo; la recortamos al badge.
    badge = image.crop((64, 64, 192, 192)).resize((120, 120))
    image.paste(badge, (72, 72))

    title_font = font(ARIAL_BOLD, 48)
    subtitle_font = font(ARIAL, 30)
    label_font = font(ARIAL_BOLD, 22)

    draw.text((232, 78), "MANUAL DE ENFERMERÍA · UNLA", font=label_font, fill=BORDO)
    draw.text((232, 116), title, font=title_font, fill=NAVY)
    draw.text((232, 178), subtitle, font=subtitle_font, fill=TEXT)

    draw.line([(72, 260), (width - 72, 260)], fill=BORDER, width=2)

    draw.text(
        (72, 300),
        "Material gráfico pendiente de reemplazo por el equipo de Enfermería.",
        font=font(ARIAL, 34),
        fill=SUBTLE,
    )
    draw.text(
        (72, 356),
        "La imagen definitiva debe subirse desde el panel de administración.",
        font=font(ARIAL, 30),
        fill=SUBTLE,
    )

    draw.text((72, height - 104), "Universidad Nacional de Lanús", font=label_font, fill=NAVY)
    draw.text(
        (72, height - 72),
        "Departamento de Salud Comunitaria · Licenciatura en Enfermería",
        font=font(ARIAL, 24),
        fill=SUBTLE,
    )

    image.save(UPLOADS / name, "JPEG", quality=82, optimize=True)


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    UPLOADS.mkdir(parents=True, exist_ok=True)

    make_icon(192, maskable=False).save(ICONS / "icon-192.png", optimize=True)
    make_icon(512, maskable=False).save(ICONS / "icon-512.png", optimize=True)
    make_icon(512, maskable=True).save(ICONS / "maskable-512.png", optimize=True)
    make_icon(180, maskable=False).save(ICONS / "apple-touch-icon.png", optimize=True)

    favicon = make_icon(64, maskable=False).convert("RGBA")
    favicon.save(
        ROOT / "public" / "favicon.ico",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )

    make_placeholder(
        "placeholder-anatomia-1.jpg",
        "Anatomía · venas del antebrazo",
        "Referencia para la punción venosa periférica",
    )
    make_placeholder(
        "placeholder-anatomia-2.jpg",
        "Anatomía · dorso de la mano",
        "Referencia para la punción venosa periférica",
    )
    make_placeholder(
        "placeholder-sim-1.jpg",
        "Simulación · bandeja de materiales",
        "Materiales preparados para la técnica",
    )
    make_placeholder(
        "placeholder-sim-2.jpg",
        "Simulación · colocación del catéter",
        "Punción en el brazo del simulador",
    )
    make_placeholder(
        "placeholder-sim-3.jpg",
        "Simulación · fijación del catéter",
        "Apósito transparente sobre el sitio de punción",
    )

    for path in sorted(ICONS.iterdir()):
        print(f"{path.relative_to(ROOT)} · {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
