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

    class Config:
        from_attributes = True


# ---------- Orders ----------
class OrderCreate(BaseModel):
    client_id: Optional[str] = None
    new_client_name: Optional[str] = None
    new_client_phone: Optional[str] = None
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


class OrderUpdate(BaseModel):
    stage: Optional[str] = None
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


class OrderOut(BaseModel):
    id: str
    client_id: str
    client_name: str
    phone: str = ""
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
    stage: str
    created_at: str
    stage_changed_at: str
    status: dict

    class Config:
        from_attributes = True
