from sqlalchemy import Column, String, Float
from database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, default="")
    birthday = Column(String, default="")  # "" or "YYYY-MM-DD"
    notes = Column(String, default="")
    source = Column(String, default="shop")  # "shop" | "delivery" | "both"
    created_at = Column(String)


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, index=True)
    client_id = Column(String, nullable=False)
    client_name = Column(String, default="")
    phone = Column(String, default="")
    product = Column(String)
    product_type = Column(String, default="Торт на заказ")
    size = Column(String, default="")
    filling = Column(String, default="")
    price = Column(Float, default=0)
    prepaid = Column(Float, default=0)
    fulfillment = Column(String, default="Самовывоз")  # "Самовывоз" | "Доставка"
    address = Column(String, default="")
    due_date = Column(String)  # "YYYY-MM-DD"
    due_time = Column(String, default="")  # "HH:MM"
    comment = Column(String, default="")
    stage = Column(String, default="new")
    created_at = Column(String)
    stage_changed_at = Column(String)

    # ---- новые поля ----
    order_type = Column(String, default="ready")  # "ready" | "custom"
    responsible_manager = Column(String, default="")

    # поля только для order_type == "custom"
    event_date = Column(String, default="")
    design = Column(String, default="")
    inscription = Column(String, default="")
    reference_photo_url = Column(String, default="")
    client_wishes = Column(String, default="")

    # причина отказа
    rejection_reason = Column(String, default="")
    rejection_comment = Column(String, default="")
    rejected_at = Column(String, default="")


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, default="")
    role = Column(String, default="manager")  # "manager" | "rop" | "director"


class Lead(Base):
    __tablename__ = "leads"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, default="")
    phone = Column(String, default="")  # используется как chatId для сопоставления с Wazzup
    channel = Column(String, default="whatsapp")  # whatsapp | instagram | call | other
    stage = Column(String, default="new")  # new | chatting | agreed | converted
    last_message = Column(String, default="")
    last_message_at = Column(String, default="")
    client_id = Column(String, default="")  # заполняется при конвертации в клиента
    created_at = Column(String)


class LeadMessage(Base):
    __tablename__ = "lead_messages"

    id = Column(String, primary_key=True, index=True)
    lead_id = Column(String, nullable=False)
    direction = Column(String, default="in")  # "in" (от клиента) | "out" (наш ответ)
    text = Column(String, default="")
    created_at = Column(String)
