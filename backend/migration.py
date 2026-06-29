"""
AegisTrace Database Migration Engine
────────────────────────────────────
Runs on every startup. All operations are idempotent — safe to run multiple times.
Uses raw ALTER TABLE so SQLModel's create_all is never destructive.
"""
from sqlalchemy import text, inspect


def run_migrations(engine):
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    # ── 1. Add hashed_password to user ──────────────────────────────────────
    if "user" in existing_tables:
        user_cols = [c["name"] for c in inspector.get_columns("user")]
        if "hashed_password" not in user_cols:
            with engine.connect() as conn:
                conn.execute(text('ALTER TABLE "user" ADD COLUMN hashed_password TEXT'))
                conn.commit()
            print("[migration] Added hashed_password to user table")

        # ── 2. Migrate passwords from AuditLog → User.hashed_password ───────
        from sqlmodel import Session, select
        from models import User, AuditLog
        with Session(engine) as session:
            users_needing_pw = [
                u for u in session.exec(select(User)).all()
                if not u.hashed_password
            ]
            migrated = 0
            for user in users_needing_pw:
                logs = session.exec(
                    select(AuditLog)
                    .where(AuditLog.entity_type == "user_pw")
                    .where(AuditLog.entity_id == str(user.id))
                    .order_by(AuditLog.timestamp.desc())
                ).all()
                for log in logs:
                    if log.new_value and len(log.new_value) == 64:
                        user.hashed_password = log.new_value
                        session.add(user)
                        migrated += 1
                        break
            if migrated:
                session.commit()
                print(f"[migration] Migrated {migrated} user password(s) to hashed_password column")

    # ── 3. Add org_id stub to user (for future multi-tenancy) ───────────────
    if "user" in existing_tables:
        user_cols = [c["name"] for c in inspector.get_columns("user")]
        if "org_id" not in user_cols:
            with engine.connect() as conn:
                conn.execute(text('ALTER TABLE "user" ADD COLUMN org_id INTEGER DEFAULT 1'))
                conn.commit()
            print("[migration] Added org_id to user table")

    # ── 4. Add org_id stub to case ───────────────────────────────────────────
    if "case" in existing_tables:
        case_cols = [c["name"] for c in inspector.get_columns("case")]
        if "org_id" not in case_cols:
            with engine.connect() as conn:
                conn.execute(text('ALTER TABLE "case" ADD COLUMN org_id INTEGER DEFAULT 1'))
                conn.commit()
            print("[migration] Added org_id to case table")

    # ── 5. Add playbook_state to case ────────────────────────────────────────
    if "case" in existing_tables:
        case_cols = [c["name"] for c in inspector.get_columns("case")]
        if "playbook_state" not in case_cols:
            with engine.connect() as conn:
                conn.execute(text('ALTER TABLE "case" ADD COLUMN playbook_state TEXT DEFAULT \'{}\''))
                conn.commit()
            print("[migration] Added playbook_state to case table")

    # ── 6. Reset and re-seed demo data ────────────────────────────────────────
    # Only resets rows with case_number starting with "SOC-DEMO-"
    if "case" in existing_tables:
        from sqlmodel import Session, select
        from models import Case, TimelineEvent, IOCCorrelation
        with Session(engine) as session:
            demo_cases = session.exec(
                select(Case).where(Case.case_number.like("SOC-DEMO-%"))
            ).all()
            for dc in demo_cases:
                # Remove related timeline events
                for te in session.exec(
                    select(TimelineEvent).where(TimelineEvent.case_id == dc.id)
                ).all():
                    session.delete(te)
                # Remove IOC correlations pointing only to this case
                for corr in session.exec(select(IOCCorrelation)).all():
                    import json
                    ids = json.loads(corr.case_ids or "[]")
                    if dc.id in ids:
                        ids.remove(dc.id)
                        if not ids:
                            session.delete(corr)
                        else:
                            corr.case_ids = json.dumps(ids)
                            corr.case_count = len(ids)
                            session.add(corr)
                session.delete(dc)
            if demo_cases:
                session.commit()
                print(f"[migration] Reset {len(demo_cases)} demo case(s)")

    # ── 7. Endpoint + LogBatch + LogAnalysis tables (created by create_all, just verify) ──
    # SQLModel's create_all handles new tables automatically on startup.

    # ── 8. New Endpoint columns (live telemetry snapshot + risk score) ────────
    if "endpoint" in existing_tables:
        ep_cols = [c["name"] for c in inspector.get_columns("endpoint")]
        new_ep_cols = {
            "last_processes":      "TEXT DEFAULT '[]'",
            "last_connections":    "TEXT DEFAULT '[]'",
            "last_system_info":    "TEXT DEFAULT '{}'",
            "local_risk_score":    "INTEGER DEFAULT 0",
            "total_alerts":        "INTEGER DEFAULT 0",
            "total_failed_logins": "INTEGER DEFAULT 0",
        }
        for col, definition in new_ep_cols.items():
            if col not in ep_cols:
                with engine.connect() as conn:
                    conn.execute(text(f"ALTER TABLE endpoint ADD COLUMN {col} {definition}"))
                    conn.commit()
                print(f"[migration] Added {col} to endpoint table")

    # ── 9. Vulnerability scan columns on endpoint ─────────────────────────────
    if "endpoint" in existing_tables:
        ep_cols = [c["name"] for c in inspector.get_columns("endpoint")]
        vuln_cols = {
            "vuln_findings":  "TEXT DEFAULT '[]'",
            "last_vuln_scan": "TIMESTAMP DEFAULT NULL",
        }
        for col, definition in vuln_cols.items():
            if col not in ep_cols:
                with engine.connect() as conn:
                    conn.execute(text(f"ALTER TABLE endpoint ADD COLUMN {col} {definition}"))
                    conn.commit()
                print(f"[migration] Added {col} to endpoint table")

    # ── 10. CaseEmbedding table (NVIDIA Phase 2 — created by create_all) ────────
    # SQLModel's create_all handles this automatically; nothing to ALTER here.
    # Log it so the startup sequence is visible.
    if "caseembedding" in inspector.get_table_names():
        pass  # table exists — created by create_all
    else:
        print("[migration] CaseEmbedding table will be created by create_all")

    # ── 11. Add org_id to tables that predate multi-tenancy (security hardening) ──
    # These tables were created before the org_id pattern was established on
    # User/Case/IdentityNode and were missing per-org isolation entirely.
    _ORG_ID_TABLES = [
        "vthistory", "emailanalysisrecord", "pcapanalysis", "policy",
        "webhookconfig", "identityconnector", "approvedaiservice",
        "authevent", "identityanomaly", "itdralert", "ioccorrelation",
    ]
    for table in _ORG_ID_TABLES:
        if table in existing_tables:
            cols = [c["name"] for c in inspector.get_columns(table)]
            if "org_id" not in cols:
                with engine.connect() as conn:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN org_id INTEGER DEFAULT 1"))
                    conn.commit()
                print(f"[migration] Added org_id to {table} table")

    print("[migration] All migrations complete.")
