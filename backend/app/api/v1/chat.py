import json
from datetime import datetime, timezone
from typing import Optional, Dict, Set

from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db, async_session_factory
from app.core.dependencies import get_current_user
from app.core.security import verify_token
from app.models.user import User
from app.models.property import Property
from app.models.chat import ChatConversation, ChatMessage
from app.services.notification_service import notify

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, set()).add(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        conns = self.active.get(user_id)
        if conns:
            conns.discard(ws)
            if not conns:
                self.active.pop(user_id, None)

    async def send_to_user(self, user_id: str, payload: dict):
        conns = self.active.get(user_id)
        if not conns:
            return
        data = json.dumps(payload, default=str)
        dead = []
        for ws in conns:
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(user_id, ws)


manager = ConnectionManager()


def _is_participant(conv: ChatConversation, user_id: str) -> bool:
    return user_id in (conv.tenant_id, conv.owner_id)


async def _get_conversation(db: AsyncSession, conversation_id: str) -> ChatConversation:
    result = await db.execute(
        select(ChatConversation)
        .where(ChatConversation.id == conversation_id)
        .options(selectinload(ChatConversation.messages))
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return conv


def _serialize_conversation(conv: ChatConversation, current_user_id: str) -> dict:
    other_id = conv.owner_id if current_user_id == conv.tenant_id else conv.tenant_id
    unread = (
        conv.unread_count_tenant
        if current_user_id == conv.tenant_id
        else conv.unread_count_owner
    )
    return {
        "id": conv.id,
        "tenant_id": conv.tenant_id,
        "owner_id": conv.owner_id,
        "property_id": conv.property_id,
        "room_id": conv.room_id,
        "other_user_id": other_id,
        "other_user_name": None,
        "last_message_at": conv.last_message_at,
        "last_message_preview": conv.last_message_preview,
        "unread_count": unread or 0,
        "created_at": conv.created_at,
    }


def _serialize_message(msg: ChatMessage) -> dict:
    return {
        "id": msg.id,
        "conversation_id": msg.conversation_id,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "message_type": msg.message_type,
        "content": msg.content,
        "media_url": msg.media_url,
        "is_read": msg.is_read,
        "read_at": msg.read_at,
        "metadata": msg.message_metadata or {},
        "created_at": msg.created_at,
    }


async def _load_user_names(db: AsyncSession, convs: list) -> dict:
    """Batch-load display names for the other participants."""
    user_ids = set()
    for c in convs:
        user_ids.update((c.tenant_id, c.owner_id))
    if not user_ids:
        return {}
    result = await db.execute(select(User).where(User.id.in_(user_ids)))
    return {u.id: u.full_name for u in result.scalars().all()}


@router.get("/conversations")
async def list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(ChatConversation)
        .where(
            or_(
                ChatConversation.tenant_id == current_user.id,
                ChatConversation.owner_id == current_user.id,
            ),
            ChatConversation.is_active == True,
        )
        .options(selectinload(ChatConversation.messages))
        .order_by(ChatConversation.last_message_at.desc().nullslast(), ChatConversation.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    convs = result.scalars().unique().all()

    names = await _load_user_names(db, convs)
    data = []
    for conv in convs:
        item = _serialize_conversation(conv, current_user.id)
        item["other_user_name"] = names.get(item["other_user_id"])
        data.append(item)
    return {"conversations": data, "page": page, "page_size": page_size}


@router.post("/conversations", status_code=status.HTTP_201_CREATED)
async def start_conversation(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    property_id = payload.get("property_id")
    room_id = payload.get("room_id")
    other_user_id = payload.get("user_id")

    owner_id = None
    prop = None
    if property_id:
        result = await db.execute(select(Property).where(Property.id == property_id))
        prop = result.scalar_one_or_none()
        if not prop:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
        owner_id = prop.owner_id
    elif other_user_id:
        owner_id = other_user_id
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide property_id or user_id",
        )

    if owner_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot start a conversation with yourself",
        )

    # Tenant is always the initiating side; owner is the property owner.
    tenant_id = current_user.id

    result = await db.execute(
        select(ChatConversation).where(
            ChatConversation.tenant_id == tenant_id,
            ChatConversation.owner_id == owner_id,
            ChatConversation.property_id == property_id,
            ChatConversation.room_id == room_id,
        )
    )
    conv = result.scalar_one_or_none()
    if conv:
        return _serialize_conversation(conv, current_user.id)

    conv = ChatConversation(
        tenant_id=tenant_id,
        owner_id=owner_id,
        property_id=property_id,
        room_id=room_id,
    )
    db.add(conv)
    await db.flush()
    return _serialize_conversation(conv, current_user.id)


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await _get_conversation(db, conversation_id)
    if not _is_participant(conv, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    msgs = result.scalars().all()

    # Mark incoming messages as read.
    now = datetime.now(timezone.utc)
    unread_ids = [
        m.id for m in msgs
        if m.receiver_id == current_user.id and not m.is_read
    ]
    if unread_ids:
        for m in msgs:
            if m.id in unread_ids:
                m.is_read = True
                m.read_at = now
        if current_user.id == conv.tenant_id:
            conv.unread_count_tenant = 0
        else:
            conv.unread_count_owner = 0
        await db.flush()
        await manager.send_to_user(
            conv.owner_id if current_user.id == conv.tenant_id else conv.tenant_id,
            {"type": "messages_read", "conversation_id": conversation_id},
        )

    return {
        "messages": [_serialize_message(m) for m in reversed(msgs)],
        "page": page,
        "page_size": page_size,
    }


async def _create_and_broadcast(
    db: AsyncSession,
    conv: ChatConversation,
    sender: User,
    content: Optional[str],
    message_type: str = "text",
    media_url: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> ChatMessage:
    receiver_id = conv.owner_id if sender.id == conv.tenant_id else conv.tenant_id
    msg = ChatMessage(
        conversation_id=conv.id,
        sender_id=sender.id,
        receiver_id=receiver_id,
        message_type=message_type,
        content=content,
        media_url=media_url,
        is_delivered=True,
        delivered_at=datetime.now(timezone.utc),
        message_metadata=metadata or {},
    )
    db.add(msg)

    preview = (content or "[Media]")[:200]
    conv.last_message_at = datetime.now(timezone.utc)
    conv.last_message_preview = preview
    if sender.id == conv.tenant_id:
        conv.unread_count_owner = (conv.unread_count_owner or 0) + 1
    else:
        conv.unread_count_tenant = (conv.unread_count_tenant or 0) + 1
    await db.flush()

    await notify(
        db,
        receiver_id,
        notification_type="new_message",
        title=f"New message from {sender.full_name}",
        body=preview,
        reference_id=conv.id,
        reference_type="conversation",
    )
    await db.flush()

    await manager.send_to_user(receiver_id, {
        "type": "new_message",
        "conversation_id": conv.id,
        "message": _serialize_message(msg),
    })
    return msg


@router.post("/conversations/{conversation_id}/messages", status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await _get_conversation(db, conversation_id)
    if not _is_participant(conv, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    content = (payload.get("content") or "").strip()
    media_url = payload.get("media_url")
    message_type = payload.get("message_type", "text")

    if not content and not media_url:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message must have content or media",
        )
    if len(content) > 5000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message too long (max 5000 characters)",
        )

    msg = await _create_and_broadcast(
        db, conv, current_user, content or None, message_type, media_url,
        metadata=payload.get("metadata"),
    )
    return _serialize_message(msg)


@router.websocket("/ws")
async def chat_websocket(ws: WebSocket, token: str = Query(...)):
    user_id = None
    payload = verify_token(token)
    if not payload or not payload.get("sub"):
        await ws.close(code=4401)
        return
    user_id = payload["sub"]

    await manager.connect(user_id, ws)
    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
            except ValueError:
                await ws.send_text(json.dumps({"type": "error", "detail": "Invalid JSON"}))
                continue

            action = data.get("action")
            if action == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))
                continue

            if action != "send_message":
                await ws.send_text(json.dumps({"type": "error", "detail": "Unknown action"}))
                continue

            conversation_id = data.get("conversation_id")
            content = (data.get("content") or "").strip()
            media_url = data.get("media_url")
            if not conversation_id or (not content and not media_url):
                await ws.send_text(json.dumps({"type": "error", "detail": "conversation_id and content/media required"}))
                continue

            async with async_session_factory() as db:
                try:
                    conv = await _get_conversation(db, conversation_id)
                    if not _is_participant(conv, user_id):
                        await ws.send_text(json.dumps({"type": "error", "detail": "Access denied"}))
                        continue
                    result = await db.execute(select(User).where(User.id == user_id))
                    sender = result.scalar_one_or_none()
                    if not sender:
                        await ws.close(code=4401)
                        return
                    msg = await _create_and_broadcast(
                        db, conv, sender, content or None,
                        data.get("message_type", "text"), media_url,
                        metadata=data.get("metadata"),
                    )
                    await db.commit()
                    await ws.send_text(json.dumps({
                        "type": "message_sent",
                        "conversation_id": conv.id,
                        "message": _serialize_message(msg),
                    }, default=str))
                except HTTPException as e:
                    await db.rollback()
                    await ws.send_text(json.dumps({"type": "error", "detail": e.detail}))
                except Exception:
                    await db.rollback()
                    await ws.send_text(json.dumps({"type": "error", "detail": "Failed to send message"}))
    except WebSocketDisconnect:
        manager.disconnect(user_id, ws)
    except Exception:
        manager.disconnect(user_id, ws)
