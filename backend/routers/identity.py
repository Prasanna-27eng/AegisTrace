"""
AegisTrace Identity Graph Router — v3.0
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
"""
import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from models import IdentityNode, IdentityEdge, IdentityAnomaly, User, AuditLog
from database import get_session
from routers.auth import get_current_user
import adaptive_config

router = APIRouter(prefix="/api/identity", tags=["identity"])


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

    return identity_engine.process(node_id=node_id, session=session)


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
