"""
Бизнес-логика Balgyn Bakery CRM.

Это единственный файл, который стоит редактировать, чтобы поменять
правила работы CRM — расчёт статусов заказов, напоминания о днях
рождения, что считать "зависшим" заказом и т.д. Роуты в main.py
просто вызывают эти функции, сами по себе они правил не содержат.

Примеры того, что можно поменять здесь:
- STALE_DAYS: через сколько дней заказ считать "зависшим"
- BIRTHDAY_REMINDER_DAYS: за сколько дней до ДР показывать напоминание
- compute_order_status: изменить пороги "скоро" / "просрочено"
- days_to_next_birthday: изменить логику расчёта дня рождения
"""

from datetime import date, datetime, timedelta

# ---------- настройки, которые чаще всего меняют ----------
STALE_DAYS = 3              # заказ без движения дольше — считается "зависшим"
SOON_THRESHOLD_DAYS = 2     # заказ считается "скоро" если срок через N дней или меньше
BIRTHDAY_REMINDER_DAYS = 7  # показывать день рождения клиента, если он через N дней или меньше


def _parse_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def days_between(d1: date, d2: date) -> int:
    return (d2 - d1).days


def compute_order_status(order: dict) -> dict:
    """
    Возвращает статус заказа: {"key": ..., "label": ..., "tone": ...}
    tone используется фронтендом для подсветки цветом:
    "overdue" (просрочен), "today" (сегодня), "soon" (скоро),
    "ok" (в порядке), "done" (завершён)
    """
    if order["stage"] == "completed":
        return {"key": "done", "label": "Завершён", "tone": "done"}

    due_date = _parse_date(order["due_date"])
    today = date.today()
    diff = days_between(today, due_date)

    if diff < 0:
        return {"key": "overdue", "label": f"Просрочен на {abs(diff)} дн.", "tone": "overdue"}
    if diff == 0:
        due_time = order.get("due_time") or ""
        label = f"Сегодня, {due_time}".strip().rstrip(",")
        return {"key": "today", "label": label, "tone": "today"}
    if diff <= SOON_THRESHOLD_DAYS:
        return {"key": "soon", "label": f"Через {diff} дн.", "tone": "soon"}

    return {"key": "ok", "label": due_date.strftime("%d.%m.%Y"), "tone": "ok"}


def days_to_next_birthday(birthday: str | None) -> int | None:
    """Сколько дней осталось до ближайшего дня рождения клиента."""
    if not birthday:
        return None
    b = _parse_date(birthday)
    today = date.today()
    next_bday = date(today.year, b.month, b.day)
    if next_bday < today:
        next_bday = date(today.year + 1, b.month, b.day)
    return days_between(today, next_bday)


def is_stale(order: dict) -> bool:
    """Заказ считается "зависшим", если не двигался по этапам дольше STALE_DAYS."""
    if order["stage"] == "completed":
        return False
    changed_raw = order.get("stage_changed_at") or order["created_at"]
    changed = _parse_date(changed_raw)
    return days_between(changed, date.today()) > STALE_DAYS


def seed_demo_data(db, models, new_id, today_iso):
    """Заполняет базу демо-данными при первом запуске (если она пустая)."""
    today = date.today()
    bday1 = (today + timedelta(days=4)).isoformat()
    bday2 = (today + timedelta(days=25)).isoformat()
    bday3 = date(today.year, 3, 14).isoformat()

    c1, c2, c3 = new_id(), new_id(), new_id()

    clients = [
        models.Client(id=c1, name="Айгерим Нурланова", phone="+7 701 234-56-78",
                      birthday=bday1, notes="Любит шоколадный бисквит, без орехов",
                      source="both", created_at=(today - timedelta(days=60)).isoformat()),
        models.Client(id=c2, name="Марат Сейтқали", phone="+7 707 345-67-89",
                      birthday=bday2, notes="Заказывает на доставку в офис",
                      source="delivery", created_at=(today - timedelta(days=20)).isoformat()),
        models.Client(id=c3, name="Дана Ахметова", phone="+7 702 456-78-90",
                      birthday=bday3, notes="Постоянный клиент, самовывоз из магазина",
                      source="shop", created_at=(today - timedelta(days=120)).isoformat()),
    ]
    for c in clients:
        db.add(c)

    orders = [
        models.Order(
            id=new_id(), client_id=c1, client_name="Айгерим Нурланова", phone="+7 701 234-56-78",
            product="Торт «Шоколадный трюфель», 2 кг", product_type="Торт на заказ", size="2 кг",
            filling="Шоколад, без орехов", price=22000, prepaid=10000, fulfillment="Доставка",
            address="Проспект Туран, 42, Астана", due_date=today.isoformat(), due_time="18:00",
            comment="Надпись «С Днём рождения, Айгерим!»", stage="production",
            created_at=(today - timedelta(days=2)).isoformat(),
            stage_changed_at=(today - timedelta(days=1)).isoformat(),
        ),
        models.Order(
            id=new_id(), client_id=c2, client_name="Марат Сейтқали", phone="+7 707 345-67-89",
            product="Капкейки ассорти, 24 шт", product_type="Капкейки", size="24 шт",
            filling="Ассорти вкусов", price=18000, prepaid=18000, fulfillment="Доставка",
            address="Улица Кенесары, 20, офис 305, Астана", due_date=(today + timedelta(days=1)).isoformat(),
            due_time="12:00", comment="Для корпоратива, коробка с логотипом", stage="ready",
            created_at=(today - timedelta(days=3)).isoformat(),
            stage_changed_at=(today - timedelta(days=1)).isoformat(),
        ),
        models.Order(
            id=new_id(), client_id=c3, client_name="Дана Ахметова", phone="+7 702 456-78-90",
            product="Торт «Медовик», 1.5 кг", product_type="Торт на заказ", size="1.5 кг",
            filling="Мёд-сметана", price=15000, prepaid=0, fulfillment="Самовывоз", address="",
            due_date=(today - timedelta(days=1)).isoformat(), due_time="17:00",
            comment="Уже должен быть готов — уточнить у клиента", stage="new",
            created_at=(today - timedelta(days=6)).isoformat(),
            stage_changed_at=(today - timedelta(days=6)).isoformat(),
        ),
        models.Order(
            id=new_id(), client_id=c1, client_name="Айгерим Нурланова", phone="+7 701 234-56-78",
            product="Печенье на палочке, 30 шт", product_type="Печенье", size="30 шт",
            filling="Ванильное", price=12000, prepaid=12000, fulfillment="Самовывоз", address="",
            due_date=(today - timedelta(days=10)).isoformat(), due_time="15:00",
            comment="Детский день рождения", stage="completed",
            created_at=(today - timedelta(days=12)).isoformat(),
            stage_changed_at=(today - timedelta(days=10)).isoformat(),
        ),
    ]
    for o in orders:
        db.add(o)

    db.commit()
