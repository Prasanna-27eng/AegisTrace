"""
AegisTrace Case Comments Router — v3.0
────────────────────────────────────────
Structured analyst notes, handoff comments, and decisions per case.

GET    /api/cases/{id}/comments
POST   /api/cases/{id}/comments
PATCH  /api/cases/{id}/comments/{comment_id}
DELETE /api/cases/{id}/comments/{comment_id}
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from models import CaseComment, Case, User, AuditLog
from database import get_session
from routers.auth import get_current_user

router = APIRouter(tags=["comments"])


@router.get("/api/cases/{case_id}/comments")
def get_comments(
    case_id: int,
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    comments = session.exec(
        select(CaseComment)
        .where(CaseComment.case_id == case_id)
        .order_by(CaseComment.created_at.asc())
    ).all()
    return comments


@router.post("/api/cases/{case_id}/comments")
def add_comment(
    case_id: int,
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    body = (data.get("body") or "").strip()
    if not body:
        raise HTTPException(400, "Comment body required")
    comment = CaseComment(
        case_id=case_id,
        author_email=user.email,
        author_name=user.name,
        comment_type=data.get("comment_type", "note"),
        body=body,
        is_pinned=data.get("is_pinned", False),
    )
    session.add(comment)
    session.add(AuditLog(
        action="comment_added", entity_type="case", entity_id=str(case_id),
        new_value=body[:200], user_id=user.id, user_email=user.email,
    ))
    session.commit()
    session.refresh(comment)
    return comment


@router.patch("/api/cases/{case_id}/comments/{comment_id}")
def update_comment(
    case_id: int,
    comment_id: int,
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    comment = session.get(CaseComment, comment_id)
    if not comment or comment.case_id != case_id:
        raise HTTPException(404, "Comment not found")
    if "body" in data:
        comment.body = data["body"]
    if "is_pinned" in data:
        comment.is_pinned = data["is_pinned"]
    if "comment_type" in data:
        comment.comment_type = data["comment_type"]
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment


@router.delete("/api/cases/{case_id}/comments/{comment_id}")
def delete_comment(
    case_id: int,
    comment_id: int,
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    comment = session.get(CaseComment, comment_id)
    if not comment or comment.case_id != case_id:
        raise HTTPException(404, "Comment not found")
    session.delete(comment)
    session.commit()
    return {"ok": True}
