"""
Balgyn Bakery CRM — API сервер.

Запуск:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Роуты ниже нарочно простые — они читают/пишут в базу и вызывают
функции из logic.py. Если нужно поменять правила (статусы, дни
рождения, "зависшие" заказы) — правьте logic.py, а не этот файл.
"""

import uuid
from datetime import date

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import Base, engine, SessionLocal, get_db
import models
import schemas
import logic
import auth

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Balgyn Bakery CRM API")

# В проде замените "*" на конкретный домен вашего фронтенда.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def new_id() -> str:
    return uuid.uuid4().hex[:8]


def today_iso() -> str:
    return date.today().isoformat()


@app.on_event("startup")
def seed_if_empty():
    db = SessionLocal()
    try:
        if db.query(models.Client).count() == 0:
            logic.seed_demo_data(db, models, new_id, today_iso)
        if db.query(models.User).count() == 0:
            db.add(models.User(
                id=new_id(), username="director", full_name="Директор",
                role="director", password_hash=auth.hash_password("balgyn2026"),
            ))
            db.add(models.User(
                id=new_id(), username="rop", full_name="РОП",
                role="rop", password_hash=auth.hash_password("balgyn2026"),
            ))
            db.add(models.User(
                id=new_id(), username="manager", full_name="Менеджер",
                role="manager", password_hash=auth.hash_password("balgyn2026"),
            ))
            db.commit()
    finally:
        db.close()


# ================= Auth =================
@app.post("/api/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    token = auth.create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=schemas.UserOut)
def read_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@app.post("/api/auth/change-password")
def change_password(
    payload: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not auth.verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Текущий пароль неверен")
    current_user.password_hash = auth.hash_password(payload.new_password)
    db.commit()
    return {"status": "ok"}


# ================= Employees (director only) =================
@app.get("/api/users", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_director)):
    return db.query(models.User).order_by(models.User.username).all()


@app.post("/api/users", response_model=schemas.UserOut)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.require_director)):
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(400, "Логин уже занят")
    user = models.User(
        id=new_id(), username=payload.username, full_name=payload.full_name,
        role=payload.role, password_hash=auth.hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.put("/api/users/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: str, payload: schemas.UserRoleUpdate, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.require_director)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        user.role = payload.role
    if payload.new_password:
        user.password_hash = auth.hash_password(payload.new_password)
    db.commit()
    db.refresh(user)
    return user


@app.delete("/api/users/{user_id}", status_code=204)
def delete_user(user_id: str, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.require_director)):
    if user_id == current_user.id:
        raise HTTPException(400, "Нельзя удалить свою же учётную запись")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    db.delete(user)
    db.commit()
    return None


def _order_to_out(o: models.Order) -> schemas.OrderOut:
    data = {
        "id": o.id, "client_id": o.client_id, "client_name": o.client_name, "phone": o.phone,
        "product": o.product, "product_type": o.product_type, "size": o.size, "filling": o.filling,
        "price": o.price, "prepaid": o.prepaid, "fulfillment": o.fulfillment, "address": o.address,
        "due_date": o.due_date, "due_time": o.due_time, "comment": o.comment, "stage": o.stage,
        "created_at": o.created_at, "stage_changed_at": o.stage_changed_at,
    }
    status = logic.compute_order_status(data)
    return schemas.OrderOut(**data, status=status)


def _client_to_out(c: models.Client, db: Session) -> schemas.ClientOut:
    order_count = db.query(func.count(models.Order.id)).filter(models.Order.client_id == c.id).scalar() or 0
    return schemas.ClientOut(
        id=c.id, name=c.name, phone=c.phone, birthday=c.birthday, notes=c.notes,
        source=c.source, created_at=c.created_at,
        days_to_birthday=logic.days_to_next_birthday(c.birthday),
        order_count=order_count,
    )


# ================= Clients =================
@app.get("/api/clients", response_model=list[schemas.ClientOut])
def list_clients(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    clients = db.query(models.Client).order_by(models.Client.created_at.desc()).all()
    return [_client_to_out(c, db) for c in clients]


@app.put("/api/clients/{client_id}", response_model=schemas.ClientOut)
def update_client(client_id: str, payload: schemas.ClientUpdate, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(404, "Client not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    return _client_to_out(client, db)


@app.delete("/api/clients/{client_id}", status_code=204)
def delete_client(client_id: str, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(404, "Client not found")
    db.delete(client)
    db.commit()
    return None


# ================= Orders =================
@app.get("/api/orders", response_model=list[schemas.OrderOut])
def list_orders(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    orders = db.query(models.Order).order_by(models.Order.created_at.desc()).all()
    return [_order_to_out(o) for o in orders]


@app.post("/api/orders", response_model=schemas.OrderOut)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db),
                  current_user: models.User = Depends(auth.get_current_user)):
    client_id = payload.client_id
    client_name = ""

    if client_id:
        client = db.query(models.Client).filter(models.Client.id == client_id).first()
        if not client:
            raise HTTPException(404, "Client not found")
        client_name = client.name
    else:
        if not payload.new_client_name:
            raise HTTPException(400, "new_client_name is required when client_id is not provided")
        client_id = new_id()
        client_name = payload.new_client_name
        db.add(models.Client(
            id=client_id, name=payload.new_client_name, phone=payload.new_client_phone or "",
            birthday="", notes="", source="delivery" if payload.fulfillment == "Доставка" else "shop",
            created_at=today_iso(),
        ))

    order = models.Order(
        id=new_id(), client_id=client_id, client_name=client_name, phone=payload.new_client_phone or "",
        product=payload.product, product_type=payload.product_type, size=payload.size,
        filling=payload.filling, price=payload.price, prepaid=payload.prepaid,
        fulfillment=payload.fulfillment, address=payload.address, due_date=payload.due_date,
        due_time=payload.due_time, comment=payload.comment, stage="new",
        created_at=today_iso(), stage_changed_at=today_iso(),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return _order_to_out(order)


@app.put("/api/orders/{order_id}", response_model=schemas.OrderOut)
def update_order(order_id: str, payload: schemas.OrderUpdate, db: Session = Depends(get_db),
                  current_user: models.User = Depends(auth.get_current_user)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    updates = payload.dict(exclude_unset=True)
    if "stage" in updates and updates["stage"] != order.stage:
        order.stage_changed_at = today_iso()
    for field, value in updates.items():
        setattr(order, field, value)
    db.commit()
    db.refresh(order)
    return _order_to_out(order)


@app.delete("/api/orders/{order_id}", status_code=204)
def delete_order(order_id: str, db: Session = Depends(get_db),
                  current_user: models.User = Depends(auth.get_current_user)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    db.delete(order)
    db.commit()
    return None


@app.get("/api/health")
def health():
    return {"status": "ok"}
