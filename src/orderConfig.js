// Единый конфиг типов и статусов заказа — источник правды для всего
// фронтенда (Kanban, Dashboard, формы). Совпадает по смыслу с
// backend/order_config.py. Если меняете статусы — правьте оба файла.

export const ORDER_TYPES = [
  { id: "ready", label: "Готовый товар" },
  { id: "custom", label: "На заказ" },
];
export const orderTypeLabel = (t) => ORDER_TYPES.find(x => x.id === t)?.label || t;

export const STAGE_LABELS = {
  new: "Новый заказ",
  discussion: "Согласование",
  payment_pending: "Ожидаем оплату",
  cooking: "Готовится",
  ready_to_pickup: "Готов к выдаче",
  sold: "Продано",
  rejected: "Отказ",
};

export const READY_ORDER_STAGES = ["new", "discussion", "payment_pending", "sold", "rejected"];
export const CUSTOM_ORDER_STAGES = ["new", "discussion", "payment_pending", "cooking", "ready_to_pickup", "sold", "rejected"];
export const TERMINAL_STAGES = ["sold", "rejected"];

// Порядок колонок канбана — суперсет обоих типов заказа
export const KANBAN_STAGE_ORDER = ["new", "discussion", "payment_pending", "cooking", "ready_to_pickup", "sold", "rejected"];

export const REJECTION_REASONS = [
  "Дорого", "Не устроил ассортимент", "Не подошла дата",
  "Клиент не отвечает", "Купил у конкурента", "Передумал", "Другое",
];

export function getAvailableStages(orderType) {
  return orderType === "custom" ? CUSTOM_ORDER_STAGES : READY_ORDER_STAGES;
}

// Спокойные цвета по статусу — для бейджа этапа на карточке/колонке
export const STAGE_COLORS = {
  new: "text-sky-700 bg-sky-50 border-sky-200",
  discussion: "text-violet-700 bg-violet-50 border-violet-200",
  payment_pending: "text-amber-700 bg-amber-50 border-amber-200",
  cooking: "text-orange-700 bg-orange-50 border-orange-200",
  ready_to_pickup: "text-emerald-700 bg-emerald-50 border-emerald-200",
  sold: "text-emerald-700 bg-emerald-50 border-emerald-200",
  rejected: "text-slate-600 bg-slate-100 border-slate-300",
};
