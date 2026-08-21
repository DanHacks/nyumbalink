from sqlalchemy import (
    Column, String, Boolean, Text, DateTime, ForeignKey, JSON, Integer
)
from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, IdMixin


class ChatConversation(IdMixin, TimestampMixin, Base):
    __tablename__ = "chat_conversations"

    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=True
    )
    room_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rooms.id"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_message_preview: Mapped[str] = mapped_column(String(200), nullable=True)
    unread_count_tenant: Mapped[int] = mapped_column(Integer, default=0)
    unread_count_owner: Mapped[int] = mapped_column(Integer, default=0)

    messages = relationship("ChatMessage", back_populates="conversation", lazy="selectin")


class ChatMessage(IdMixin, TimestampMixin, Base):
    __tablename__ = "chat_messages"

    conversation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("chat_conversations.id"), nullable=False, index=True
    )
    sender_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    receiver_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )

    message_type: Mapped[str] = mapped_column(String(20), default="text")
    content: Mapped[str] = mapped_column(Text, nullable=True)
    media_url: Mapped[str] = mapped_column(String(1000), nullable=True)

    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    is_delivered: Mapped[bool] = mapped_column(Boolean, default=False)
    delivered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    message_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

    conversation = relationship("ChatConversation", back_populates="messages")
