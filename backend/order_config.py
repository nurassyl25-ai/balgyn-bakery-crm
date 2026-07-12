"""
Единый конфиг типов и статусов заказа.

Это единственное место, где перечислены статусы продаж и то, какие из
них доступны для готового товара vs индивидуального заказа. Если нужно
добавить/убрать статус — правьте только этот файл.

order_type:
    "ready"  — готовый товар (основная масса продаж)
    "custom" — индивидуальный заказ на торт (редко)

stage (единый список на все заказы, но доступность зависит от order_type):
    new             — Новый заказ
    discussion      — Согласование
    payment_pending — Ожидаем оплату
    cooking         — Готовится            (только custom)
    ready_to_pickup — Готов к выдаче        (только custom)
    sold            — Продано
    rejected        — Отказ
"""

ORDER_TYPES = [
    {"id": "ready", "label": "Готовый товар"},
    {"id": "custom", "label": "На заказ"},
]

STAGE_LABELS = {
    "new": "Новый заказ",
    "discussion": "Согласование",
    "payment_pending": "Ожидаем оплату",
    "cooking": "Готовится",
    "ready_to_pickup": "Готов к выдаче",
    "sold": "Продано",
    "rejected": "Отказ",
}

# Статусы, доступные для готового товара — без производственных этапов
READY_ORDER_STAGES = ["new", "discussion", "payment_pending", "sold", "rejected"]

# Статусы, доступные для индивидуального заказа — с этапами производства
CUSTOM_ORDER_STAGES = ["new", "discussion", "payment_pending", "cooking", "ready_to_pickup", "sold", "rejected"]

# Финальные статусы — заказ больше не в работе
TERMINAL_STAGES = ["sold", "rejected"]

REJECTION_REASONS = [
    "Дорого",
    "Не устроил ассортимент",
    "Не подошла дата",
    "Клиент не отвечает",
    "Купил у конкурента",
    "Передумал",
    "Другое",
]

# Старые статусы (до этого обновления) -> новые, для миграции существующих заказов
STAGE_MIGRATION_MAP = {
    "new": "new",
    "prepaid": "payment_pending",
    "production": "cooking",
    "ready": "ready_to_pickup",
    "completed": "sold",
}


def get_available_stages(order_type: str) -> list:
    return CUSTOM_ORDER_STAGES if order_type == "custom" else READY_ORDER_STAGES


def normalize_legacy_order(stage: str, order_type: str | None) -> tuple:
    """
    Приводит старую пару (stage, order_type) к новому формату.
    Используется один раз при миграции существующих заказов в базе.
    Возвращает (new_stage, new_order_type).
    """
    old_stage = stage
    new_stage = STAGE_MIGRATION_MAP.get(old_stage, old_stage)
    if order_type:
        new_order_type = order_type
    else:
        new_order_type = "custom" if old_stage in ("production", "ready") else "ready"
    return new_stage, new_order_type
