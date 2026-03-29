import os
import uuid
from pathlib import Path

from app.config import get_settings
from app.models.document import Document, DocumentFormat

settings = get_settings()


class ExportService:
    def __init__(self):
        self.export_dir = Path(settings.export_dir)
        self.export_dir.mkdir(parents=True, exist_ok=True)

    async def export(self, document: Document, format: DocumentFormat) -> str:
        """Export document to the requested format and return the file path."""
        filename = f"{uuid.uuid4()}_{document.title}"
        # Sanitize filename
        filename = "".join(c if c.isalnum() or c in "._- " else "_" for c in filename)

        if format == DocumentFormat.MARKDOWN:
            return await self._export_markdown(document, filename)
        elif format == DocumentFormat.HTML:
            return await self._export_html(document, filename)
        elif format == DocumentFormat.PDF:
            return await self._export_pdf(document, filename)
        elif format == DocumentFormat.DOCX:
            return await self._export_docx(document, filename)
        elif format == DocumentFormat.TXT:
            return await self._export_txt(document, filename)
        else:
            raise ValueError(f"Unsupported export format: {format}")

    async def _export_markdown(self, document: Document, filename: str) -> str:
        path = self.export_dir / f"{filename}.md"
        path.write_text(document.content or "", encoding="utf-8")
        return str(path)

    async def _export_txt(self, document: Document, filename: str) -> str:
        path = self.export_dir / f"{filename}.txt"
        path.write_text(document.content or "", encoding="utf-8")
        return str(path)

    async def _export_html(self, document: Document, filename: str) -> str:
        path = self.export_dir / f"{filename}.html"
        if document.content_html:
            html_content = document.content_html
        else:
            html_content = self._markdown_to_html(document.content or "")

        full_html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{document.title}</title>
  <style>
    body {{ font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; line-height: 1.6; }}
    h1 {{ color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 8px; }}
    h2 {{ color: #16213e; }}
    h3 {{ color: #0f3460; }}
    ul {{ padding-left: 20px; }}
    li {{ margin-bottom: 4px; }}
    strong {{ color: #1a1a2e; }}
  </style>
</head>
<body>
{html_content}
</body>
</html>"""
        path.write_text(full_html, encoding="utf-8")
        return str(path)

    async def _export_pdf(self, document: Document, filename: str) -> str:
        """Export to PDF using weasyprint if available, fallback to HTML."""
        path = self.export_dir / f"{filename}.pdf"
        try:
            from weasyprint import HTML as WeasyHTML
            html_content = self._markdown_to_html(document.content or "")
            WeasyHTML(string=html_content).write_pdf(str(path))
        except ImportError:
            # Fallback: export as HTML with .pdf extension
            html_path = await self._export_html(document, filename)
            path = Path(html_path).with_suffix(".pdf.html")
            Path(html_path).rename(path)
        return str(path)

    async def _export_docx(self, document: Document, filename: str) -> str:
        """Export to DOCX using python-docx if available, fallback to txt."""
        path = self.export_dir / f"{filename}.docx"
        try:
            from docx import Document as DocxDocument
            from docx.shared import Inches, Pt

            doc = DocxDocument()
            doc.add_heading(document.title, 0)

            content = document.content or ""
            for line in content.split("\n"):
                line = line.strip()
                if line.startswith("# "):
                    doc.add_heading(line[2:], level=1)
                elif line.startswith("## "):
                    doc.add_heading(line[3:], level=2)
                elif line.startswith("### "):
                    doc.add_heading(line[4:], level=3)
                elif line.startswith("- ") or line.startswith("* "):
                    doc.add_paragraph(line[2:], style="List Bullet")
                elif line:
                    doc.add_paragraph(line)

            doc.save(str(path))
        except ImportError:
            # Fallback to txt
            path = path.with_suffix(".txt")
            path.write_text(document.content or "", encoding="utf-8")
        return str(path)

    def _markdown_to_html(self, markdown_text: str) -> str:
        """Simple markdown to HTML conversion."""
        try:
            import markdown
            return markdown.markdown(
                markdown_text,
                extensions=["tables", "fenced_code", "nl2br"],
            )
        except ImportError:
            # Basic fallback
            lines = markdown_text.split("\n")
            html_lines = []
            for line in lines:
                if line.startswith("### "):
                    html_lines.append(f"<h3>{line[4:]}</h3>")
                elif line.startswith("## "):
                    html_lines.append(f"<h2>{line[3:]}</h2>")
                elif line.startswith("# "):
                    html_lines.append(f"<h1>{line[2:]}</h1>")
                elif line.startswith("- ") or line.startswith("* "):
                    html_lines.append(f"<li>{line[2:]}</li>")
                elif line.startswith("**") and line.endswith("**"):
                    html_lines.append(f"<strong>{line[2:-2]}</strong>")
                elif line.strip():
                    html_lines.append(f"<p>{line}</p>")
                else:
                    html_lines.append("<br>")
            return "\n".join(html_lines)
