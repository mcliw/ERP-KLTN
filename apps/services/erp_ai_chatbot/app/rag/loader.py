from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import List

@dataclass
class Doc:
    doc_id: str
    title: str
    text: str
    source_path: str
    source_type: str  # md/txt/docx/pdf

def _read_text_smart(fp: Path) -> str:
    for enc in ("utf-8-sig", "utf-8", "cp1258", "cp1252", "latin1"):
        try:
            return fp.read_text(encoding=enc).strip()
        except UnicodeDecodeError:
            continue
    return fp.read_text(encoding="utf-8", errors="ignore").strip()

def _load_docx(fp: Path) -> str:
    from docx import Document
    doc = Document(str(fp))
    parts = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
    return "\n".join(parts).strip()

def _load_pdf(fp: Path) -> str:
    # PDF text-based: dùng pypdf
    from pypdf import PdfReader
    r = PdfReader(str(fp))
    parts = []
    for page in r.pages:
        t = page.extract_text() or ""
        t = t.strip()
        if t:
            parts.append(t)
    return "\n\n".join(parts).strip()

def load_data_dir(data_dir: str) -> List[Doc]:
    p = Path(data_dir)
    if not p.exists():
        return []

    docs: List[Doc] = []
    exts = {".md", ".txt", ".docx", ".pdf"}

    for fp in sorted([x for x in p.rglob("*") if x.is_file() and x.suffix.lower() in exts]):
        ext = fp.suffix.lower()
        if ext in (".md", ".txt"):
            text = _read_text_smart(fp)
            source_type = ext[1:]
        elif ext == ".docx":
            text = _load_docx(fp)
            source_type = "docx"
        elif ext == ".pdf":
            text = _load_pdf(fp)
            source_type = "pdf"
        else:
            continue

        text = (text or "").strip()
        if not text:
            continue

        docs.append(
            Doc(
                doc_id=fp.name, 
                title=fp.stem,
                text=text,
                source_path=str(fp),
                source_type=source_type,
            )
        )
    return docs
