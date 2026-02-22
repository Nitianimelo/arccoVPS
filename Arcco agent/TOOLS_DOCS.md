# Tools: Geração de Documentos

## Formatos Suportados

| Formato | Lib | Use case |
|---------|-----|---------|
| DOCX | python-docx | Relatórios, propostas, contratos |
| XLSX | openpyxl | Planilhas, dados tabulares |
| CSV | csv (stdlib) | Dados simples, importação |
| HTML | jinja2 | Relatórios web, emails |
| Markdown | - | Documentação, READMEs |

## Tool Definition: Generate Document

```python
register_tool(
    name="generate_document",
    description="Gera documento em formato DOCX, XLSX, CSV, HTML ou Markdown. "
                "Use para criar relatórios, planilhas, documentação. "
                "Especifique o formato desejado.",
    parameters={
        "format": {
            "type": "string",
            "enum": ["docx", "xlsx", "csv", "html", "markdown"],
            "description": "Formato do documento",
            "required": True,
        },
        "title": {"type": "string", "description": "Título do documento"},
        "content": {
            "type": "object",
            "description": "Conteúdo estruturado conforme o formato",
            "required": True,
        },
        "filename": {"type": "string", "description": "Nome do arquivo"},
    },
    handler=handle_generate_document,
)
```

## Implementação: DOCX

```python
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import os

def generate_docx(title: str, content: dict, filename: str) -> str:
    doc = Document()

    # Estilo do título
    title_para = doc.add_heading(title, level=0)
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER

    sections = content.get("sections", [])
    for section in sections:
        stype = section.get("type", "paragraph")

        if stype == "heading":
            doc.add_heading(section["text"], level=section.get("level", 1))

        elif stype == "paragraph":
            doc.add_paragraph(section["text"])

        elif stype == "table":
            rows = section.get("rows", [])
            if rows:
                table = doc.add_table(rows=len(rows), cols=len(rows[0]))
                table.style = "Table Grid"
                for i, row in enumerate(rows):
                    for j, cell in enumerate(row):
                        table.rows[i].cells[j].text = str(cell)

                # Header bold
                for cell in table.rows[0].cells:
                    for paragraph in cell.paragraphs:
                        for run in paragraph.runs:
                            run.bold = True

        elif stype == "bullet_list":
            for item in section.get("items", []):
                doc.add_paragraph(item, style="List Bullet")

    path = os.path.join("/tmp", filename)
    doc.save(path)
    return f"DOCX gerado: {path} ({os.path.getsize(path)} bytes)"
```

## Implementação: XLSX

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
import os

def generate_xlsx(title: str, content: dict, filename: str) -> str:
    wb = Workbook()
    ws = wb.active
    ws.title = title[:31]  # Excel limita 31 chars

    # Header style
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="1a1a2e", end_color="1a1a2e", fill_type="solid")

    sheets = content.get("sheets", [{"name": "Data", "rows": content.get("rows", [])}])

    for i, sheet_data in enumerate(sheets):
        if i == 0:
            ws = wb.active
            ws.title = sheet_data.get("name", "Sheet1")[:31]
        else:
            ws = wb.create_sheet(title=sheet_data.get("name", f"Sheet{i+1}")[:31])

        rows = sheet_data.get("rows", [])
        for row_idx, row in enumerate(rows):
            for col_idx, value in enumerate(row):
                cell = ws.cell(row=row_idx + 1, column=col_idx + 1, value=value)
                if row_idx == 0:
                    cell.font = header_font
                    cell.fill = header_fill
                    cell.alignment = Alignment(horizontal="center")

        # Auto-adjust column widths
        for col in ws.columns:
            max_length = max(len(str(cell.value or "")) for cell in col)
            ws.column_dimensions[col[0].column_letter].width = min(max_length + 4, 50)

    path = os.path.join("/tmp", filename)
    wb.save(path)
    return f"XLSX gerado: {path} ({os.path.getsize(path)} bytes)"
```

## Implementação: HTML Report

```python
def generate_html(title: str, content: dict, filename: str) -> str:
    sections_html = ""
    for section in content.get("sections", []):
        stype = section.get("type", "paragraph")
        if stype == "heading":
            level = section.get("level", 2)
            sections_html += f"<h{level}>{section['text']}</h{level}>\n"
        elif stype == "paragraph":
            sections_html += f"<p>{section['text']}</p>\n"
        elif stype == "table":
            rows = section.get("rows", [])
            sections_html += "<table>\n"
            for i, row in enumerate(rows):
                tag = "th" if i == 0 else "td"
                sections_html += "<tr>" + "".join(f"<{tag}>{c}</{tag}>" for c in row) + "</tr>\n"
            sections_html += "</table>\n"

    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        body {{ font-family: -apple-system, system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a2e; }}
        h1 {{ border-bottom: 3px solid #0f3460; padding-bottom: 10px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th {{ background: #1a1a2e; color: white; padding: 12px; text-align: left; }}
        td {{ padding: 10px; border-bottom: 1px solid #eee; }}
        tr:nth-child(even) {{ background: #f8f9fa; }}
    </style>
</head>
<body>
    <h1>{title}</h1>
    {sections_html}
</body>
</html>"""

    path = os.path.join("/tmp", filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    return f"HTML gerado: {path} ({os.path.getsize(path)} bytes)"
```

## Router principal

```python
def handle_generate_document(format: str, content: dict, title: str = "Document", filename: str = None) -> str:
    if not filename:
        filename = f"document.{format}"

    generators = {
        "docx": generate_docx,
        "xlsx": generate_xlsx,
        "html": generate_html,
        "csv": generate_csv,
        "markdown": generate_markdown,
    }

    generator = generators.get(format)
    if not generator:
        return f"ERRO: Formato '{format}' não suportado. Use: {list(generators.keys())}"

    try:
        return generator(title, content, filename)
    except Exception as e:
        return f"ERRO ao gerar {format}: {e}"
```
