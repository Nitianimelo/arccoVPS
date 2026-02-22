# Tools: Geração de PDF

## Libs disponíveis no ambiente

- `reportlab` — Criação de PDFs do zero (canvas, platypus)
- `pypdf` — Manipulação de PDFs existentes (merge, split, encrypt)
- `pdfplumber` — Extração de texto e tabelas

## Tool Definition

```python
register_tool(
    name="generate_pdf",
    description="Gera um documento PDF a partir de conteúdo estruturado. "
                "Use para criar relatórios, documentos formatados, tabelas, "
                "e qualquer conteúdo que o usuário precise em formato PDF. "
                "O conteúdo pode incluir títulos, parágrafos, tabelas e imagens.",
    parameters={
        "title": {"type": "string", "description": "Título do documento"},
        "content": {
            "type": "array",
            "description": "Lista de blocos de conteúdo",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "enum": ["heading", "paragraph", "table", "spacer"]},
                    "text": {"type": "string"},
                    "level": {"type": "integer", "description": "Nível do heading (1-3)"},
                    "rows": {"type": "array", "description": "Linhas da tabela (primeira = header)"},
                },
            },
        },
        "filename": {"type": "string", "description": "Nome do arquivo de saída"},
    },
    handler=handle_generate_pdf,
)
```

## Implementação do Handler

```python
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)
from reportlab.lib import colors

def handle_generate_pdf(title: str, content: list, filename: str = "output.pdf") -> str:
    """Gera PDF estruturado com reportlab."""
    output_path = os.path.join("/tmp", filename)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=25*mm,
        bottomMargin=20*mm,
    )

    styles = getSampleStyleSheet()

    # Estilos customizados
    styles.add(ParagraphStyle(
        "CustomTitle",
        parent=styles["Title"],
        fontSize=24,
        spaceAfter=20,
        textColor=HexColor("#1a1a2e"),
    ))
    styles.add(ParagraphStyle(
        "CustomH1",
        parent=styles["Heading1"],
        fontSize=18,
        spaceAfter=12,
        textColor=HexColor("#16213e"),
    ))
    styles.add(ParagraphStyle(
        "CustomH2",
        parent=styles["Heading2"],
        fontSize=14,
        spaceAfter=10,
        textColor=HexColor("#0f3460"),
    ))
    styles.add(ParagraphStyle(
        "CustomBody",
        parent=styles["Normal"],
        fontSize=11,
        spaceAfter=8,
        leading=16,
    ))

    story = []
    story.append(Paragraph(title, styles["CustomTitle"]))
    story.append(Spacer(1, 12))

    heading_map = {1: "CustomH1", 2: "CustomH2", 3: "Heading3"}

    for block in content:
        btype = block.get("type", "paragraph")

        if btype == "heading":
            level = block.get("level", 1)
            style_name = heading_map.get(level, "CustomH1")
            story.append(Paragraph(block["text"], styles[style_name]))

        elif btype == "paragraph":
            story.append(Paragraph(block["text"], styles["CustomBody"]))

        elif btype == "table":
            rows = block.get("rows", [])
            if rows:
                table = Table(rows, repeatRows=1)
                table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#1a1a2e")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTSIZE", (0, 0), (-1, 0), 11),
                    ("FONTSIZE", (0, 1), (-1, -1), 10),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, HexColor("#f0f0f0")]),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("PADDING", (0, 0), (-1, -1), 8),
                ]))
                story.append(table)
                story.append(Spacer(1, 12))

        elif btype == "spacer":
            story.append(Spacer(1, 20))

        elif btype == "page_break":
            story.append(PageBreak())

    doc.build(story)
    return f"PDF gerado: {output_path} ({os.path.getsize(output_path)} bytes)"
```

## Padrões importantes

### NUNCA use caracteres Unicode especiais
Subscritos (₀₁₂), sobrescritos (⁰¹²), e caracteres especiais renderizam como caixas pretas.
Use tags `<sub>` e `<super>` dentro de Paragraph.

### Tabelas grandes
Para tabelas com muitas colunas, use `Table(data, colWidths=[...])` para controlar largura.

### Imagens
```python
from reportlab.platypus import Image

img = Image("path/to/image.png", width=150*mm, height=100*mm)
story.append(img)
```

### Fontes customizadas
```python
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

pdfmetrics.registerFont(TTFont("CustomFont", "path/to/font.ttf"))
```
