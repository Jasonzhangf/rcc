#!/usr/bin/env python3
from pathlib import Path
import sys

REQUIRED = [
    "docs/agent-routing/150-regression-matrix-routing.md",
    "docs/PHASE_12_REGRESSION_MATRIX_WORKFLOW.md",
    "docs/PHASE_12_REGRESSION_MATRIX_BATCH_01.md",
    "docs/PHASE_12_REGRESSION_MATRIX_BATCH_02.md",
    "docs/PHASE_12_REGRESSION_MATRIX_BATCH_03.md",
    "docs/PHASE_12_REGRESSION_MATRIX_BATCH_04.md",
    "docs/PHASE_12_REGRESSION_MATRIX_BATCH_05.md",
    "docs/PHASE_12_REGRESSION_MATRIX_CLOSEOUT.md",
    "docs/PHASE_12_REGRESSION_MATRIX_GAP_INVENTORY.md",
    "docs/PROTOCOL_COMPATIBILITY_MATRIX.md",
    ".agents/skills/rcc-regression-matrix/SKILL.md",
]


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    missing = []
    found = []
    for rel in REQUIRED:
        path = root / rel
        if path.exists():
            found.append(rel)
        else:
            missing.append(rel)

    if missing:
        print("PHASE12_REGRESSION_MATRIX_VERIFY: FAIL")
        for rel in missing:
            print(f"- missing {rel}")
        return 1

    print("PHASE12_REGRESSION_MATRIX_VERIFY: PASS")
    for rel in found:
        print(f"- found {rel}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
