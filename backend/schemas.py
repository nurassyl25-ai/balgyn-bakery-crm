from typing import Optional
from pydantic import BaseModel


# ---------- Auth ----------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    username: str
    full_name: str
    role: str

    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str = ""
    role: str = "manager"  # "manager" | "rop" | "director"


class UserRoleUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    new_password: Optional[str] = None


# ---------- Leads (WhatsApp/Instagram/звонки) ----------
class LeadOut(BaseModel):
    id: str
    name: str = ""
    phone: str = ""
    channel: str = "whatsapp"
    stage: str = "new"
    last_message: str = ""
    last_message_at: str = ""
    client_id: str = ""
    created_at: str

    class Config:
        from_attributes = True


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    stage: Optional[str] = None


class LeadMessageOut(BaseModel):
    id: str
    lead_id: str
    direction: str
    text: str
    created_at: str

    class Config:
        from_attributes = True


class LeadMessageCreate(BaseModel):
    text: str


# ---------- Clients ----------
class ClientBase(BaseModel):
    name: str
    phone: str = ""
    birthday: str = ""
    notes: str = ""
    source: str = "shop"


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    birthday: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None


class ClientOut(ClientBase):
    id: str
    created_at: str
    days_to_birthday: Optional[int] = None
    order_count: int = 0
    total_spent: float = 0
    average_check: float = 0
    last_order_date: str = ""
    last_order_product: str = ""

    class Config:
        from_attributes = True


# ---------- Orders ----------
class OrderCreate(BaseModel):
    client_id: Optional[str] = None
    new_client_name: Optional[str] = None
    new_client_phone: Optional[str] = None
    order_type: str = "ready"  # "ready" | "custom"
    product: str
    product_type: str = "Торт на заказ"
    size: str = ""
    filling: str = ""
    price: float = 0
    prepaid: float = 0
    fulfillment: str = "Самовывоз"
    address: str = ""
    due_date: str
    due_time: str = ""
    comment: str = ""
    responsible_manager: str = ""
    event_date: str = ""
    design: str = ""
    inscription: str = ""
    reference_photo_url: str = ""
    client_wishes: str = ""


class OrderUpdate(BaseModel):
    stage: Optional[str] = None
    order_type: Optional[str] = None
    product: Optional[str] = None
    product_type: Optional[str] = None
    size: Optional[str] = None
    filling: Optional[str] = None
    price: Optional[float] = None
    prepaid: Optional[float] = None
    fulfillment: Optional[str] = None
    address: Optional[str] = None
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    comment: Optional[str] = None
    responsible_manager: Optional[str] = None
    event_date: Optional[str] = None
    design: Optional[str] = None
    inscription: Optional[str] = None
    reference_photo_url: Optional[str] = None
    client_wishes: Optional[str] = None


class OrderReject(BaseModel):
    reason: str
    comment: str = ""


class OrderOut(BaseModel):
    id: str
    client_id: str
    client_name: str
    phone: str = ""
    order_type: str = "ready"
    product: str
    product_type: str
    size: str = ""
    filling: str = ""
    price: float = 0
    prepaid: float = 0
    fulfillment: str
    address: str = ""
    due_date: str
    due_time: str = ""
    comment: str = ""
    responsible_manager: str = ""
    event_date: str = ""
    design: str = ""
    inscription: str = ""
    reference_photo_url: str = ""
    client_wishes: str = ""
    rejection_reason: str = ""
    rejection_comment: str = ""
    rejected_at: str = ""
    stage: str
    created_at: str
    stage_changed_at: str
    status: dict

    class Config:
        from_attributes = True
