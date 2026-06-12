from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

DOCUMENT_SUFFIXES = {".pdf"}
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".avif"}


def human_title(stem: str) -> str:
    title = stem.replace("_", " ").replace("-", " ")
    title = re.sub(r"\bOK\b", "", title, flags=re.IGNORECASE)
    title = re.sub(r"\b(pdf|png|jpg|jpeg|svg|webp|gif|avif)\b", "", title, flags=re.IGNORECASE)
    title = re.sub(r"\b(\d+\.\d+|\d+)\b", lambda match: "" if len(match.group(1)) <= 2 else match.group(1), title)
    title = re.sub(r"\s+", " ", title).strip(" .-_")
    return title


def build_inventory(base: Path) -> dict:
    items = []
    for path in sorted(p for p in base.rglob("*") if p.is_file() and p.suffix.lower() in DOCUMENT_SUFFIXES | IMAGE_SUFFIXES):
        rel = path.relative_to(base).as_posix()
        parts = rel.split("/")
        top_level = parts[0]
        is_graphic = top_level.upper() == "MATERIAL GRAFICO" or path.suffix.lower() in IMAGE_SUFFIXES
        category = parts[1] if is_graphic and len(parts) > 1 else top_level

        items.append(
            {
                "title": human_title(path.stem),
                "file": rel,
                "category": category,
                "collection": top_level,
                "section": "graphics" if is_graphic else "documents",
                "kind": "image" if path.suffix.lower() in IMAGE_SUFFIXES else "document",
                "extension": path.suffix.lower().lstrip("."),
                "sizeBytes": path.stat().st_size,
            }
        )

    document_count = sum(1 for item in items if item["section"] == "documents")
    graphic_count = len(items) - document_count

    return {
        "libraryTitle": "Biblioteca Scout Chilena Rescatada",
        "generatedAt": datetime.now(timezone.utc).date().isoformat(),
        "fileCount": len(items),
        "documentCount": document_count,
        "graphicCount": graphic_count,
        "source": "static",
        "items": items,
    }


def main() -> int:
    if len(sys.argv) != 3:
        print("Uso: python3 generate_inventory.py <carpeta_scout> <salida_json>")
        return 1

    source = Path(sys.argv[1]).expanduser().resolve()
    target = Path(sys.argv[2]).expanduser().resolve()

    payload = build_inventory(source)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Inventario generado: {target} ({payload['fileCount']} archivos)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
