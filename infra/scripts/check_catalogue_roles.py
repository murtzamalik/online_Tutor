#!/usr/bin/env python3
"""Fail if AuthController @CatalogueRoles annotations drift from api/endpoints.json."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
catalogue = json.loads((ROOT / "api" / "endpoints.json").read_text())
expected = {e["id"]: e["roles"] for e in catalogue}

controller = (
    ROOT
    / "backend/core-api/src/main/java/com/karsaaz/studyloop/identity/api/AuthController.java"
).read_text()
anns = re.findall(
    r'@CatalogueRoles\(id\s*=\s*"([^"]+)"\s*,\s*roles\s*=\s*"([^"]+)"\)',
    controller,
)
if not anns:
    print("No @CatalogueRoles found on AuthController", file=sys.stderr)
    sys.exit(1)

errors = []
for eid, roles in anns:
    if eid not in expected:
        errors.append(f"{eid} not in catalogue")
    elif expected[eid] != roles:
        errors.append(f"{eid}: code={roles!r} catalogue={expected[eid]!r}")

if errors:
    print("Role-map equality failed:")
    for e in errors:
        print(" -", e)
    sys.exit(1)

print(f"OK: {len(anns)} AuthController endpoints match catalogue roles")
