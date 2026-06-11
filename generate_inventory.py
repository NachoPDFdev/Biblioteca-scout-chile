from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def human_title(stem: str) -> str:
    title = stem.replace("_", " ").replace("-", " ")
    title = re.sub(r"\bOK\b", "", title, flags=re.IGNORECASE)
    title = re.sub(r"\bpdf\b", "", title, flags=re.IGNORECASE)
    title = re.sub(r"\b(\d+\.\d+|\d+)\b", lambda match: "" if len(match.group(1)) <= 2 else match.group(1), title)
    title = re.sub(r"\s+", " ", title).strip(" .-_")
    return title


def build_inventory(base: Path) -> dict:
    items = []
    for path in sorted(p for p in base.rglob("*") if p.is_file() and p.suffix.lower() == ".pdf"):
        rel = path.relative_to(base).as_posix()
        items.append(
            {
                "title": human_title(path.stem),
                "file": rel,
                "category": rel.split("/")[0],
                "sizeBytes": path.stat().st_size,
            }
        )

    return {
        "libraryTitle": "Biblioteca Scout Chilena Rescatada",
        "generatedAt": "2026-06-11",
        "fileCount": len(items),
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
    print(f"Inventario generado: {target} ({payload['fileCount']} PDFs)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
