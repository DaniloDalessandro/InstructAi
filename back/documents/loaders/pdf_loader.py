"""
Extração de texto de arquivos PDF usando PyMuPDF (fitz).
Retorna lista de dicts com texto e número de página.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import List


@dataclass
class PageContent:
    page_number: int
    text: str
    char_count: int = field(init=False)

    def __post_init__(self):
        self.char_count = len(self.text)


def load_pdf(file_path: str | Path) -> List[PageContent]:
    """
    Extrai texto de todas as páginas de um PDF.
    Retorna lista de PageContent ordenada por número de página.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise ImportError("pymupdf não está instalado. Execute: pip install pymupdf")

    pages: List[PageContent] = []
    path = str(file_path)

    with fitz.open(path) as doc:
        for page_num, page in enumerate(doc, start=1):
            raw_text = page.get_text("text")
            cleaned = _clean_text(raw_text)
            if cleaned.strip():
                pages.append(PageContent(page_number=page_num, text=cleaned))

    return pages


def load_pdf_bytes(file_bytes: bytes) -> List[PageContent]:
    """Extrai texto de bytes de PDF (sem salvar em disco)."""
    try:
        import fitz
    except ImportError:
        raise ImportError("pymupdf não está instalado.")

    pages: List[PageContent] = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page_num, page in enumerate(doc, start=1):
            raw_text = page.get_text("text")
            cleaned = _clean_text(raw_text)
            if cleaned.strip():
                pages.append(PageContent(page_number=page_num, text=cleaned))

    return pages


def _clean_text(text: str) -> str:
    """Remove ruídos comuns em PDFs: hifens de quebra de linha, espaços duplicados."""
    # Remove hífens no fim de linha (palavras quebradas)
    text = re.sub(r"-\n(\w)", r"\1", text)
    # Normaliza quebras de linha excessivas
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Normaliza espaços
    text = re.sub(r"[ \t]+", " ", text)
    # Remove linhas com apenas números de página isolados
    text = re.sub(r"^\s*\d+\s*$", "", text, flags=re.MULTILINE)
    return text.strip()
