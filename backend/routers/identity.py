"""
AegisTrace Identity Graph Router — v3.1
────────────────────────────────────────
Endpoints for managing identity nodes and edges.

GET  /api/identity/nodes
POST /api/identity/nodes
PATCH /api/identity/nodes/{id}
DELETE /api/identity/nodes/{id}
GET  /api/identity/graph        — full graph payload for D3/Cytoscape
POST /api/identity/edges
DELETE /api/identity/edges/{id}
POST /api/identity/nodes/{id}/mark-compromised
GET  /api/identity/search
GET  /api/identity/attack-path  — attacker path reconstruction (BFS over IdentityEdge graph)
"""
import json
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from models import IdentityNode, IdentityEdge, IdentityAnomaly, User, AuditLog, IdentityRiskHistory, Case
from database import get_session
from routers.auth import get_current_user
import adaptive_config


def _org_case_ids(session: Session, user: User) -> set:
    """Case IDs visible to the caller's org."""
    return set(session.exec(select(Case.id).where(Case.org_id == user.org_id)).all())

router = APIRouter(prefix="/api/identity", tags=["identity"])


def _record_risk_history(session: Session, node: IdentityNode) -> None:
    """Append a risk/trust snapshot to IdentityRiskHistory after a recalculation."""
    try:
        trust_history = json.loads(node.trust_score_history or "[]")
        if trust_history and isinstance(trust_history, list):
            last = trust_history[-1]
            trust_val = float(last.get("score", 0)) if isinstance(last, dict) else float(last)
        else:
            trust_val = 0.0
    except Exception:
        trust_val = 0.0

    history = IdentityRiskHistory(
        org_id=node.org_id,
        node_id=node.id,
        risk_score=float(node.risk_score or 0),
        trust_score=trust_val,
        anomaly_count=node.anomaly_count_7d or 0,
    )
    session.add(history)
    session.commit()


@router.get("/nodes")
def list_nodes(
    node_type: Optional[str] = Query(None),
    compromised: Optional[bool] = Query(None),
    q: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    query = select(IdentityNode).where(IdentityNode.org_id == _user.org_id)
    if node_type:
        query = query.where(IdentityNode.node_type == node_type)
    if compromised is not None:
        query = query.where(IdentityNode.is_compromised == compromised)
    if q:
        query = query.where(IdentityNode.label.contains(q))
    nodes = session.exec(query.order_by(IdentityNode.risk_score.desc())).all()
    return nodes


@router.post("/nodes")
def create_node(
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    node = IdentityNode(
        node_type=data.get("node_type", "user"),
        label=data.get("label", ""),
        metadata_json=json.dumps(data.get("metadata", {})),
        risk_score=data.get("risk_score", 0),
        is_compromised=data.get("is_compromised", False),
        linked_case_ids=json.dumps(data.get("linked_case_ids", [])),
        org_id=user.org_id,
    )
    session.add(node)
    session.add(AuditLog(action="identity_node_created", entity_type="identity_node",
                         entity_id=data.get("label"), user_id=user.id, user_email=user.email))
    session.commit()
    session.refresh(node)
    return node


@router.patch("/nodes/{node_id}")
def update_node(
    node_id: int,
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    node = session.get(IdentityNode, node_id)
    if not node or node.org_id != user.org_id:
        raise HTTPException(404, "Node not found")
    for field in ("label", "node_type", "risk_score", "is_compromised"):
        if field in data:
            setattr(node, field, data[field])
    if "metadata" in data:
        node.metadata_json = json.dumps(data["metadata"])
    node.last_seen = datetime.utcnow()
    session.add(node)
    session.commit()
    session.refresh(node)
    return node


@router.delete("/nodes/{node_id}")
def delete_node(
    node_id: int,
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    node = session.get(IdentityNode, node_id)
    if not node or node.org_id != _user.org_id:
        raise HTTPException(404, "Node not found")
    # Remove edges
    edges = session.exec(
        select(IdentityEdge).where(
            (IdentityEdge.source_id == node_id) | (IdentityEdge.target_id == node_id)
        )
    ).all()
    for e in edges:
        session.delete(e)
    session.delete(node)
    session.commit()
    return {"ok": True}


@router.post("/nodes/{node_id}/mark-compromised")
def mark_compromised(
    node_id: int,
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    node = session.get(IdentityNode, node_id)
    if not node or node.org_id != user.org_id:
        raise HTTPException(404, "Node not found")
    node.is_compromised = data.get("compromised", True)
    node.risk_score = 100 if node.is_compromised else data.get("risk_score", node.risk_score)
    session.add(node)
    session.add(AuditLog(
        action="identity_marked_compromised" if node.is_compromised else "identity_cleared",
        entity_type="identity_node", entity_id=str(node_id),
        user_id=user.id, user_email=user.email,
    ))
    session.commit()
    session.refresh(node)
    return node


@router.get("/graph")
def get_graph(
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    """Full graph payload — nodes + edges — ready for D3 force-directed layout."""
    nodes = session.exec(
        select(IdentityNode).where(IdentityNode.org_id == _user.org_id)
    ).all()
    edges = session.exec(select(IdentityEdge)).all()

    node_ids = {n.id for n in nodes}
    # Only include edges where both endpoints exist
    valid_edges = [e for e in edges if e.source_id in node_ids and e.target_id in node_ids]

    return {
        "nodes": [
            {
                "id": n.id,
                "label": n.label,
                "type": n.node_type,
                "risk_score": n.risk_score,
                "is_compromised": n.is_compromised,
                "metadata": json.loads(n.metadata_json or "{}"),
                "case_ids": json.loads(n.linked_case_ids or "[]"),
                "first_seen": n.first_seen.isoformat(),
                "last_seen": n.last_seen.isoformat(),
            }
            for n in nodes
        ],
        "edges": [
            {
                "id": e.id,
                "source": e.source_id,
                "target": e.target_id,
                "relationship": e.relationship,
                "confidence": e.confidence,
                "evidence_ref": e.evidence_ref,
            }
            for e in valid_edges
        ],
        "stats": {
            "total_nodes": len(nodes),
            "compromised": sum(1 for n in nodes if n.is_compromised),
            "high_risk": sum(1 for n in nodes if n.risk_score >= adaptive_config.get("anomaly_score_threshold")),
            "total_edges": len(valid_edges),
        }
    }


@router.post("/edges")
def create_edge(
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    source = session.get(IdentityNode, data.get("source_id"))
    target = session.get(IdentityNode, data.get("target_id"))
    if not source or not target:
        raise HTTPException(404, "Source or target node not found")
    if source.org_id != user.org_id or target.org_id != user.org_id:
        raise HTTPException(404, "Source or target node not found")
    edge = IdentityEdge(
        source_id=data["source_id"],
        target_id=data["target_id"],
        relationship=data.get("relationship", "linked"),
        confidence=data.get("confidence", 100),
        evidence_ref=data.get("evidence_ref"),
    )
    session.add(edge)
    session.commit()
    session.refresh(edge)
    return edge


@router.delete("/edges/{edge_id}")
def delete_edge(
    edge_id: int,
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    edge = session.get(IdentityEdge, edge_id)
    if not edge:
        raise HTTPException(404, "Edge not found")
    source = session.get(IdentityNode, edge.source_id)
    target = session.get(IdentityNode, edge.target_id)
    if (source and source.org_id != _user.org_id) or (target and target.org_id != _user.org_id):
        raise HTTPException(404, "Edge not found")
    session.delete(edge)
    session.commit()
    return {"ok": True}



# ── v4.0 Identity Risk Engine endpoints ──────────────────────────────────────

@router.get("/nodes/{node_id}/anomalies")
def get_node_anomalies(
    node_id: int,
    resolved: Optional[bool] = Query(None),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    """Get all anomalies for a node."""
    node = session.get(IdentityNode, node_id)
    if not node or node.org_id != _user.org_id:
        raise HTTPException(404, "Node not found")
    q = select(IdentityAnomaly).where(IdentityAnomaly.node_id == node_id)
    if resolved is not None:
        q = q.where(IdentityAnomaly.resolved == resolved)
    q = q.order_by(IdentityAnomaly.detected_at.desc())
    return session.exec(q).all()


@router.post("/nodes/{node_id}/anomalies")
def create_node_anomaly(
    node_id: int,
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """
    Record an anomaly for an identity node, then immediately recalculate risk.
    Returns: {node, risk_score, anomaly, detector_results}
    """
    from core.identity_engine import engine as identity_engine

    node = session.get(IdentityNode, node_id)
    if not node or node.org_id != user.org_id:
        raise HTTPException(404, "Node not found")

    anomaly = IdentityAnomaly(
        node_id=node_id,
        anomaly_type=data.get("anomaly_type", "unknown"),
        description=data.get("description", ""),
        severity=data.get("severity", "medium"),
        confidence=float(data.get("confidence", 0.8)),
        case_id=data.get("case_id"),
        org_id=node.org_id,
    )
    session.add(anomaly)
    session.add(AuditLog(
        action="identity_anomaly_added",
        entity_type="identity_node", entity_id=str(node_id),
        new_value=f"{anomaly.severity} — {anomaly.anomaly_type}",
        user_id=user.id, user_email=user.email,
    ))
    session.commit()
    session.refresh(anomaly)

    result = identity_engine.process(node_id=node_id, session=session)

    # Record risk history snapshot
    try:
        session.refresh(node)
        _record_risk_history(session, node)
    except Exception:
        pass

    return {
        "node": result.get("node_id"),
        "risk_score": result["new_score"],
        "anomaly": anomaly,
        "detector_results": result["detector_results"],
    }


@router.patch("/nodes/{node_id}/anomalies/{anomaly_id}/resolve")
def resolve_anomaly(
    node_id: int,
    anomaly_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Mark an anomaly as resolved and recalculate risk."""
    from core.identity_engine import engine as identity_engine

    node = session.get(IdentityNode, node_id)
    if not node or node.org_id != user.org_id:
        raise HTTPException(404, "Node not found")

    anomaly = session.get(IdentityAnomaly, anomaly_id)
    if not anomaly or anomaly.node_id != node_id:
        raise HTTPException(404, "Anomaly not found")
    anomaly.resolved = True
    anomaly.resolved_at = datetime.utcnow()
    session.add(anomaly)
    session.commit()

    result = identity_engine.process(node_id=node_id, session=session)

    # Record risk history snapshot
    try:
        session.refresh(node)
        _record_risk_history(session, node)
    except Exception:
        pass

    return {"ok": True, "new_score": result["new_score"]}


@router.post("/nodes/{node_id}/recalculate")
def recalculate_node_risk(
    node_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """
    Manually trigger risk recalculation for a node.
    Returns: {node_id, old_score, new_score, detector_results}
    """
    from core.identity_engine import engine as identity_engine

    node = session.get(IdentityNode, node_id)
    if not node or node.org_id != user.org_id:
        raise HTTPException(404, "Node not found")

    result = identity_engine.process(node_id=node_id, session=session)

    # Record risk history snapshot
    try:
        session.refresh(node)
        _record_risk_history(session, node)
    except Exception:
        pass

    return result


@router.get("/search")
def search_nodes(
    q: str,
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    nodes = session.exec(
        select(IdentityNode).where(
            IdentityNode.label.contains(q) & (IdentityNode.org_id == _user.org_id)
        ).limit(20)
    ).all()
    return nodes


@router.get("/nodes/{node_id}/history")
def get_node_risk_history(
    node_id: int,
    days: int = Query(default=30, le=90),
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Return time-series risk/trust snapshots for a node (up to 90 days)."""
    node = session.get(IdentityNode, node_id)
    if not node or node.org_id != _user.org_id:
        raise HTTPException(404, "Node not found")
    cutoff = datetime.utcnow() - timedelta(days=days)
    history = session.exec(
        select(IdentityRiskHistory)
        .where(IdentityRiskHistory.node_id == node_id)
        .where(IdentityRiskHistory.recorded_at >= cutoff)
        .order_by(IdentityRiskHistory.recorded_at.asc())
    ).all()
    return [
        {
            "risk_score": h.risk_score,
            "trust_score": h.trust_score,
            "anomaly_count": h.anomaly_count,
            "recorded_at": h.recorded_at.isoformat(),
        }
        for h in history
    ]


@router.get("/attack-path")
def get_attack_path(
    node_id: Optional[int] = Query(default=None),
    case_id: Optional[int] = Query(default=None),
    max_depth: int = Query(default=5, le=10),
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Reconstruct the attacker's path through the identity graph.

    Starting from a compromised node (or all compromised nodes in a case),
    walks IdentityEdge relationships to build a directed path graph.
    Enriches each hop with ITDR alerts, case associations, and MITRE techniques.

    Returns a structured path object ready for visual rendering.
    """
    from models import ITDRAlert

    org_case_ids = _org_case_ids(session, _user)

    # ── 1. Find starting nodes ─────────────────────────────────────────────
    if node_id:
        start_nodes = session.exec(
            select(IdentityNode)
            .where(IdentityNode.id == node_id)
            .where(IdentityNode.org_id == _user.org_id)
        ).all()
    elif case_id:
        # Find compromised identities mentioned in the case's ITDR alerts
        if case_id not in org_case_ids:
            raise HTTPException(404)
        case_alerts = session.exec(
            select(ITDRAlert)
            .where(ITDRAlert.case_id == case_id)
            .where(ITDRAlert.org_id == _user.org_id)
        ).all()
        identity_labels = list({a.identity_label for a in case_alerts if a.identity_label})
        start_nodes = list(session.exec(
            select(IdentityNode)
            .where(IdentityNode.org_id == _user.org_id)
            .where(IdentityNode.label.in_(identity_labels))
        ).all()) if identity_labels else []

        # Also include explicitly compromised nodes
        compromised = session.exec(
            select(IdentityNode)
            .where(IdentityNode.org_id == _user.org_id)
            .where(IdentityNode.is_compromised == True)
        ).all()
        existing_ids = {n.id for n in start_nodes}
        for n in compromised:
            if n.id not in existing_ids:
                start_nodes.append(n)
    else:
        # All compromised nodes in the org
        start_nodes = session.exec(
            select(IdentityNode)
            .where(IdentityNode.org_id == _user.org_id)
            .where(IdentityNode.is_compromised == True)
            .order_by(IdentityNode.risk_score.desc())
            .limit(5)
        ).all()

    if not start_nodes:
        return {"nodes": [], "edges": [], "path_steps": [], "summary": "No compromised identities found."}

    # ── 2. BFS walk through IdentityEdge graph ─────────────────────────────
    visited_ids = set()
    path_nodes = {}   # id → enriched node dict
    path_edges = []
    queue = [(n, 0) for n in start_nodes]

    # Get all edges for this org's nodes (pre-load for efficiency)
    all_node_ids = [r[0] for r in session.exec(select(IdentityNode.id).where(IdentityNode.org_id == _user.org_id)).all()]
    all_edges = session.exec(
        select(IdentityEdge)
        .where(IdentityEdge.source_id.in_(all_node_ids))
    ).all()
    edge_map = {}  # source_id → list of edges
    for e in all_edges:
        edge_map.setdefault(e.source_id, []).append(e)

    # Get ITDR alerts for enrichment
    itdr_by_label = {}
    all_itdr = session.exec(
        select(ITDRAlert)
        .where(ITDRAlert.org_id == _user.org_id)
        .where(ITDRAlert.severity.in_(["critical", "high"]))
        .order_by(ITDRAlert.detected_at.desc())
        .limit(200)
    ).all()
    for alert in all_itdr:
        itdr_by_label.setdefault(alert.identity_label, []).append(alert)

    # MITRE technique map for relationship types
    REL_MITRE = {
        "compromised_by":   ("T1078", "Valid Accounts"),
        "accessed":         ("T1078.004", "Cloud Accounts"),
        "inherited_from":   ("T1134", "Token Impersonation"),
        "issued":           ("T1552.001", "Credentials in Files"),
        "owned":            ("T1098", "Account Manipulation"),
        "used":             ("T1071", "Application Layer Protocol"),
        "escalated_to":     ("T1548", "Abuse Elevation Control"),
        "lateral_to":       ("T1021", "Remote Services"),
        "exfil_via":        ("T1041", "Exfil Over C2 Channel"),
    }

    while queue:
        node, depth = queue.pop(0)
        if node.id in visited_ids or depth > max_depth:
            continue
        visited_ids.add(node.id)

        # Enrich node with ITDR alerts
        node_alerts = itdr_by_label.get(node.label, [])

        path_nodes[node.id] = {
            "id": node.id,
            "label": node.label,
            "node_type": node.node_type,
            "risk_score": float(node.risk_score or 0),
            "is_compromised": node.is_compromised,
            "privilege_level": node.privilege_level,
            "anomaly_count": node.anomaly_count_7d or 0,
            "last_active": node.last_active.isoformat() if node.last_active else None,
            "depth": depth,
            "itdr_alerts": [
                {
                    "type": a.alert_type,
                    "severity": a.severity,
                    "description": a.description[:100],
                    "detected_at": a.detected_at.isoformat() if a.detected_at else None,
                }
                for a in node_alerts[:3]
            ],
        }

        # Walk outgoing edges
        for edge in edge_map.get(node.id, []):
            target = session.get(IdentityNode, edge.target_id)
            if not target or target.org_id != _user.org_id:
                continue

            mitre_id, mitre_name = REL_MITRE.get(edge.relationship, ("T1078", "Valid Accounts"))

            path_edges.append({
                "source": edge.source_id,
                "target": edge.target_id,
                "relationship": edge.relationship,
                "confidence": edge.confidence,
                "mitre_id": mitre_id,
                "mitre_name": mitre_name,
                "evidence_ref": edge.evidence_ref,
            })

            if edge.target_id not in visited_ids:
                queue.append((target, depth + 1))

    # ── 3. Build human-readable path steps ────────────────────────────────
    path_steps = []
    for edge in path_edges:
        src = path_nodes.get(edge["source"], {})
        tgt = path_nodes.get(edge["target"], {})
        if src and tgt:
            path_steps.append({
                "step": len(path_steps) + 1,
                "from_label": src.get("label", ""),
                "from_type": src.get("node_type", ""),
                "action": edge["relationship"].replace("_", " ").title(),
                "to_label": tgt.get("label", ""),
                "to_type": tgt.get("node_type", ""),
                "mitre_id": edge["mitre_id"],
                "mitre_name": edge["mitre_name"],
            })

    # Summary
    if path_nodes:
        compromised_count = sum(1 for n in path_nodes.values() if n["is_compromised"])
        summary = (
            f"Attack path spans {len(path_nodes)} identities across {len(path_edges)} hops. "
            f"{compromised_count} confirmed compromised. "
            f"Deepest lateral reach: {max((n['depth'] for n in path_nodes.values()), default=0)} hops from initial access."
        )
    else:
        summary = "No attack path constructed."

    return {
        "nodes": list(path_nodes.values()),
        "edges": path_edges,
        "path_steps": path_steps,
        "summary": summary,
        "start_node_ids": [n.id for n in start_nodes],
    }
