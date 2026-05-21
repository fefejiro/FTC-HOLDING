from __future__ import annotations

from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]

REQUIRED_DOCS = [
    "docs/PRODUCTION-DEPLOYMENT.md",
    "docs/CLIENT-HANDOFF.md",
    "docs/LIVE-OPERATIONS.md",
    "docs/STATS-DATA-SOURCES.md",
    "docs/RELEASE-CHECKLIST.md",
    ".env.production.example",
]

FORBIDDEN_FILES = [
    ".env",
]


def main() -> int:
    missing_docs = [path for path in REQUIRED_DOCS if not (PROJECT_ROOT / path).exists()]
    forbidden_present = [path for path in FORBIDDEN_FILES if (PROJECT_ROOT / path).exists()]

    if missing_docs:
        print("Release verify failed: missing docs/files -> " + ", ".join(missing_docs))
        return 1

    if forbidden_present:
        print("Release verify failed: forbidden local secret files present -> " + ", ".join(forbidden_present))
        return 1

    print("Release verify passed: required docs and production templates are present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
