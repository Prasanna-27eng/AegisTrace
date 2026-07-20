"""
Import vendored auth0/auth0-customer-detections Sigma rules into DetectionRule.
Run manually: python3 backend/scripts/import_detections.py
Idempotent — safe to re-run (upserts on org_id + rule_name).

Source: https://github.com/auth0/auth0-customer-detections (Apache 2.0, Okta).
Files live in backend/data/detections/auth0/*.yml, vendored verbatim — see
NOTICE.md and LICENSE in that directory.
"""
import re
import sys
from datetime import datetime
from pathlib import Path

import yaml
from sqlmodel import Session, select

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import engine
from models import DetectionRule, Organisation

DETECTIONS_DIR = Path(__file__).resolve().parent.parent / "data" / "detections" / "auth0"
TECHNIQUE_RE = re.compile(r"attack\.t\d{4}(?:\.\d{3})?", re.IGNORECASE)


def _first_detection_doc(raw_yaml: str) -> dict | None:
    """auth0's files are multi-document YAML (rule + a correlation doc). We only
    want the primary rule document — the first one with a `detection` block."""
    for doc in yaml.safe_load_all(raw_yaml):
        if isinstance(doc, dict) and "detection" in doc and "title" in doc:
            return doc
    return None


def _trigger_technique(tags: list) -> str:
    for tag in tags or []:
        m = TECHNIQUE_RE.search(str(tag))
        if m:
            return m.group(0).split(".", 1)[1].upper()  # "attack.t1078" -> "T1078"
    return ""


def _build_rule(doc: dict, raw_yaml: str, org_id: int, now: datetime) -> DetectionRule:
    title = doc.get("title", "Untitled")
    logsource = doc.get("logsource") or {}
    logsource_label = "/".join(str(v) for v in logsource.values() if v)
    description = doc.get("description", "").strip()
    if logsource_label:
        description = f"[{logsource_label}] {description}"

    tags = doc.get("tags") or []
    technique = _trigger_technique(tags)
    other_tags = [t for t in tags if not TECHNIQUE_RE.search(str(t))]
    if other_tags:
        description = f"{description}\n\nTags: {', '.join(other_tags)}"

    return DetectionRule(
        org_id=org_id,
        rule_name=f"[auth0] {title}",
        trigger_technique=technique,
        trigger_case_ids="[]",
        status="imported",
        yara=None,
        sigma=raw_yaml,
        kql=None,
        splunk_spl=None,
        description=description or None,
        ai_confidence=0.0,
        severity=doc.get("level"),
        generated_at=now,
    )


def import_detections():
    if not DETECTIONS_DIR.exists():
        print(f"[import_detections] No vendored detections found at {DETECTIONS_DIR}")
        return

    files = sorted(DETECTIONS_DIR.glob("*.yml"))
    if not files:
        print(f"[import_detections] No .yml files in {DETECTIONS_DIR}")
        return

    now = datetime.utcnow()

    with Session(engine) as session:
        org_ids = [o.id for o in session.exec(select(Organisation)).all()]
        if not org_ids:
            # Organisation is a multi-tenancy stub with no seeded rows in a fresh
            # DB — every other model in this codebase defaults org_id to 1, so
            # match that convention rather than importing nothing.
            org_ids = [1]

        imported, skipped, updated = 0, 0, 0

        for path in files:
            raw_yaml = path.read_text()
            doc = _first_detection_doc(raw_yaml)
            if doc is None:
                print(f"[import_detections] Skipping {path.name} — no parseable detection document")
                skipped += 1
                continue

            for org_id in org_ids:
                rule = _build_rule(doc, raw_yaml, org_id, now)

                existing = session.exec(
                    select(DetectionRule)
                    .where(DetectionRule.org_id == org_id)
                    .where(DetectionRule.rule_name == rule.rule_name)
                ).first()

                if existing:
                    existing.sigma = rule.sigma
                    existing.description = rule.description
                    existing.trigger_technique = rule.trigger_technique
                    existing.severity = rule.severity
                    session.add(existing)
                    updated += 1
                else:
                    session.add(rule)
                    imported += 1

        session.commit()

    print(f"[import_detections] Imported {imported}, updated {updated}, skipped {skipped} "
          f"(source files: {len(files)}, orgs: {len(org_ids)})")


if __name__ == "__main__":
    import_detections()
