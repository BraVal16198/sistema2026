from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def markdown_to_story(markdown_text: str):
    styles = getSampleStyleSheet()
    style_h1 = styles["Heading1"]
    style_h2 = styles["Heading2"]
    style_h3 = styles["Heading3"]
    style_body = styles["BodyText"]
    style_body.leading = 14

    story = []
    for raw_line in markdown_text.splitlines():
        line = raw_line.strip()
        if not line:
            story.append(Spacer(1, 0.25 * cm))
            continue

        if line.startswith("# "):
            story.append(Paragraph(line[2:], style_h1))
            story.append(Spacer(1, 0.2 * cm))
            continue
        if line.startswith("## "):
            story.append(Paragraph(line[3:], style_h2))
            story.append(Spacer(1, 0.15 * cm))
            continue
        if line.startswith("### "):
            story.append(Paragraph(line[4:], style_h3))
            story.append(Spacer(1, 0.12 * cm))
            continue
        if line.startswith("- "):
            story.append(Paragraph(f"• {line[2:]}", style_body))
            continue
        if line.startswith("|") and line.endswith("|"):
            # Render simple markdown table rows as text lines
            cells = [c.strip() for c in line.strip("|").split("|")]
            if all(c.replace("-", "") == "" for c in cells):
                continue
            story.append(Paragraph(" | ".join(cells), style_body))
            continue
        if line.startswith("---"):
            story.append(Spacer(1, 0.3 * cm))
            continue

        story.append(Paragraph(line, style_body))

    return story


def main():
    root = Path(r"C:\Users\Javie\Downloads\sistema2026")
    md_path = root / "docs" / "Informe_Unidad_II_Sistema_Tech.md"
    pdf_path = root / "docs" / "Informe_Unidad_II_Sistema_Tech.pdf"

    markdown_text = md_path.read_text(encoding="utf-8")
    story = markdown_to_story(markdown_text)

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="Informe Unidad II - Sistema Tech",
        author="Equipo Sistema Tech",
    )
    doc.build(story)
    print(f"PDF generado: {pdf_path}")


if __name__ == "__main__":
    main()

