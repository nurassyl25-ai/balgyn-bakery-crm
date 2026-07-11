import React, { useState, useEffect, useCallback } from "react";
import {
  Cake, Gift, Truck, Store, Clock, Plus, X, MapPin, Calendar, ChevronRight,
  Copy, Check, Phone, ArrowRight, Trash2, Loader2, AlertCircle, CheckCircle2,
  Circle, TrendingUp, ClipboardList, User
} from "lucide-react";

// ---------- constants ----------
const ORDER_STAGES = [
  { id: "new", label: "Новый заказ" },
  { id: "prepaid", label: "Предоплата получена" },
  { id: "production", label: "Готовится" },
  { id: "ready", label: "Готов к выдаче" },
  { id: "completed", label: "Выдан / Доставлен" },
];

const PRODUCT_TYPES = ["Торт на заказ", "Капкейки", "Десерты", "Печенье", "Другое"];
const FULFILLMENT_TYPES = ["Самовывоз", "Доставка"];
const CLIENT_FILTERS = [
  { id: "all", label: "Все" },
  { id: "repeat", label: "Постоянные" },
  { id: "new", label: "Новые" },
  { id: "birthday", label: "ДР скоро" },
];
const ROLES = [
  { id: "manager", label: "Менеджер" },
  { id: "rop", label: "РОП" },
  { id: "director", label: "Директор" },
];
const roleLabel = (r) => ROLES.find(x => x.id === r)?.label || r;

const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtDateShort = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
};
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const fmtMoney = (n) => new Intl.NumberFormat("ru-RU").format(n || 0) + " ₸";
const STALE_DAYS = 3;

const TONE_STYLES = {
  overdue: "text-rose-700 bg-rose-50 border-rose-200",
  today: "text-amber-700 bg-amber-50 border-amber-200",
  soon: "text-amber-700 bg-amber-50 border-amber-200",
  ok: "text-emerald-700 bg-emerald-50 border-emerald-200",
  done: "text-slate-500 bg-slate-50 border-slate-200",
};

function StatusIcon({ tone, className }) {
  if (tone === "overdue") return <AlertCircle className={className} />;
  if (tone === "done") return <CheckCircle2 className={className} />;
  if (tone === "today" || tone === "soon") return <Clock className={className} />;
  return <Circle className={className} />;
}

import { api } from "./api.js";

export default function BalgynBakeryCRM() {
  const [tab, setTab] = useState("dashboard");
  const [clients, setClients] = useState(null);
  const [orders, setOrders] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connError, setConnError] = useState(false);
  const [toast, setToast] = useState(null);

  const refetchAll = useCallback(async () => {
    const [c, o] = await Promise.all([api.getClients(), api.getOrders()]);
    setClients(c);
    setOrders(o);
  }, []);

  const tryAutoLogin = useCallback(async () => {
    if (!localStorage.getItem("balgyn:token")) { setAuthChecked(true); return; }
    try {
      const me = await api.me();
      setCurrentUser(me);
    } catch {
      setCurrentUser(null);
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => { tryAutoLogin(); }, [tryAutoLogin]);

  useEffect(() => {
    const handler = () => setCurrentUser(null);
    window.addEventListener("balgyn:unauthorized", handler);
    return () => window.removeEventListener("balgyn:unauthorized", handler);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setTab("dashboard");
    setLoading(true);
    refetchAll()
      .then(() => setConnError(false))
      .catch((e) => { console.error(e); setConnError(true); })
      .finally(() => setLoading(false));
  }, [currentUser, refetchAll]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setClients(null);
    setOrders(null);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#FBF3EC] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoggedIn={tryAutoLogin} />;
  }

  const role = currentUser.role;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF3EC] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
      </div>
    );
  }

  if (connError) {
    return (
      <div className="min-h-screen bg-[#FBF3EC] flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white border border-rose-200 rounded-2xl p-6">
          <AlertCircle className="w-6 h-6 text-rose-500 mx-auto mb-3" />
          <p className="font-display font-semibold text-lg mb-2">Не удаётся подключиться к серверу</p>
          <p className="text-sm text-[#8B6F5C]">
            Проверьте, что Python-бэкенд запущен: <code className="bg-[#FBF3EC] px-1.5 py-0.5 rounded">uvicorn main:app --reload --port 8000</code>
          </p>
        </div>
      </div>
    );
  }

  // ---------- derived ----------
  const overdue = orders.filter(o => o.status.tone === "overdue");
  const dueToday = orders.filter(o => o.status.tone === "today");
  const activeOrders = orders.filter(o => o.stage !== "completed");
  const staleOrders = orders.filter(o => o.stage !== "completed" && daysBetween(o.stageChangedAt || o.createdAt, new Date().toISOString().slice(0,10)) > STALE_DAYS);
  const upcomingBirthdays = clients
    .filter(c => c.daysToBirthday !== null && c.daysToBirthday !== undefined && c.daysToBirthday <= 7)
    .sort((a, b) => a.daysToBirthday - b.daysToBirthday);

  // ---------- order actions ----------
  const addOrder = async (data) => {
    try {
      await api.createOrder(data);
      await refetchAll();
      showToast("Заказ создан");
    } catch (e) {
      console.error(e);
      showToast("Не удалось создать заказ");
    }
  };
  const moveOrder = async (id, dir) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const idx = ORDER_STAGES.findIndex(s => s.id === order.stage);
    const nextIdx = Math.min(Math.max(idx + dir, 0), ORDER_STAGES.length - 1);
    const nextStage = ORDER_STAGES[nextIdx].id;
    try {
      const updated = await api.updateOrder(id, { stage: nextStage });
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
    } catch (e) { console.error(e); }
  };
  const deleteOrder = async (id) => {
    try {
      await api.deleteOrder(id);
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch (e) { console.error(e); }
  };
  const markDelivered = async (id) => {
    try {
      const updated = await api.updateOrder(id, { stage: "completed" });
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
      showToast("Отмечено как выдано");
    } catch (e) { console.error(e); }
  };

  // ---------- client actions ----------
  const updateClient = async (id, data) => {
    try {
      const updated = await api.updateClient(id, data);
      setClients(prev => prev.map(c => c.id === id ? updated : c));
    } catch (e) { console.error(e); }
  };
  const deleteClient = async (id) => {
    try {
      await api.deleteClient(id);
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-[#FBF3EC] text-[#3B2417] font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-sans { font-family: 'Inter', sans-serif; }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: #E8D3BE; border-radius: 4px; }
      `}</style>

      {/* header */}
      <header className="border-b border-[#F0DFCF] sticky top-0 bg-[#FBF3EC]/95 backdrop-blur z-20">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center">
              <Cake className="w-4 h-4 text-rose-600" />
            </div>
            <span className="font-display font-semibold text-lg tracking-tight">Balgyn Bakery CRM</span>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex gap-1 bg-white border border-[#F0DFCF] rounded-xl p-1">
              {[
                { id: "dashboard", label: "Обзор" },
                { id: "orders", label: "Заказы" },
                { id: "deliveries", label: "Доставки" },
                { id: "clients", label: "Клиенты" },
                ...(role === "director" ? [{ id: "employees", label: "Сотрудники" }] : []),
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${tab === t.id ? "bg-rose-50 text-rose-700" : "text-[#8B6F5C] hover:text-[#3B2417]"}`}>
                  {t.label}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-2.5 bg-white border border-[#F0DFCF] rounded-xl px-3 py-1.5">
              <span className="text-xs text-[#8B6F5C]">
                {currentUser.fullName} · <span className="font-medium">{roleLabel(role)}</span>
              </span>
              <button onClick={handleLogout} className="text-xs text-rose-600 hover:text-rose-500 font-medium">Выйти</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {tab === "dashboard" && (
          <Dashboard overdue={overdue} dueToday={dueToday} orders={orders} clients={clients} activeOrders={activeOrders}
            staleOrders={staleOrders} upcomingBirthdays={upcomingBirthdays} setTab={setTab} role={role} />
        )}
        {tab === "orders" && (
          <OrdersBoard orders={orders} clients={clients} addOrder={addOrder} moveOrder={moveOrder} deleteOrder={deleteOrder} />
        )}
        {tab === "deliveries" && (
          <DeliveriesView orders={orders} markDelivered={markDelivered} />
        )}
        {tab === "clients" && (
          <ClientsView clients={clients} orders={orders} updateClient={updateClient} deleteClient={deleteClient} showToast={showToast} />
        )}
        {tab === "employees" && role === "director" && (
          <EmployeesView showToast={showToast} />
        )}
      </main>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#3B2417] text-[#FBF3EC] text-sm px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 z-50">
          <Check className="w-4 h-4 text-rose-300" /> {toast}
        </div>
      )}
    </div>
  );
}

// ================= Dashboard =================
function Dashboard({ overdue, dueToday, orders, clients, activeOrders, staleOrders, upcomingBirthdays, setTab, role }) {
  const stageCounts = ORDER_STAGES.map(s => ({
    ...s,
    count: orders.filter(o => o.stage === s.id).length,
    sum: orders.filter(o => o.stage === s.id).reduce((acc, o) => acc + (o.price || 0), 0),
  }));
  const totalActiveValue = activeOrders.reduce((acc, o) => acc + (o.price || 0), 0);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-1">Обзор</h1>
      <p className="text-[#8B6F5C] text-sm mb-6">Состояние заказов и доставок на сегодня, {fmtDate(todayISO())}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Активных заказов" value={activeOrders.length} tone="rose" icon={ClipboardList} onClick={() => setTab("orders")} />
        <StatCard label="Готово/доставка сегодня" value={dueToday.length} tone="amber" icon={Clock} onClick={() => setTab("deliveries")} />
        <StatCard label="Просрочено" value={overdue.length} tone="overdue" icon={AlertCircle} onClick={() => setTab("orders")} />
        <StatCard label="Клиентов" value={clients.length} tone="teal" icon={User} onClick={() => setTab("clients")} />
        <StatCard label="Дни рождения (7 дн.)" value={upcomingBirthdays.length} tone="gold" icon={Gift} onClick={() => setTab("clients")} />
        <StatCard label="Зависших заказов" value={staleOrders.length} tone="amber" icon={ClipboardList} onClick={() => setTab("orders")} />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white border border-[#F0DFCF] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-sm text-[#8B6F5C] uppercase tracking-wide">Заказы по этапам</h2>
              <span className="text-xs text-[#8B6F5C]">В работе: <span className="text-rose-600 font-medium">{fmtMoney(totalActiveValue)}</span></span>
            </div>
            <div className="space-y-2.5">
              {stageCounts.map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="text-sm text-[#8B6F5C] w-36 shrink-0">{s.label}</span>
                  <div className="flex-1 h-2 bg-[#F5E9DC] rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400" style={{ width: `${Math.min(s.count * 22, 100)}%` }} />
                  </div>
                  <span className="text-xs text-[#8B6F5C] w-16 text-right shrink-0">{fmtMoney(s.sum)}</span>
                  <span className="text-sm font-medium w-5 text-right shrink-0">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

        <div className="bg-white border border-[#F0DFCF] rounded-2xl p-5">
          <h2 className="font-display font-semibold mb-4 text-sm text-[#8B6F5C] uppercase tracking-wide">Требуют внимания</h2>
          {overdue.length === 0 && dueToday.length === 0 ? (
            <p className="text-sm text-[#8B6F5C]">Просроченных заказов нет.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {[...overdue, ...dueToday].slice(0, 6).map(o => (
                <div key={o.id} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg border ${TONE_STYLES[o.status.tone]}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusIcon tone={o.status.tone} className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{o.clientName} · {o.product}</span>
                  </div>
                  <span className="shrink-0 text-xs font-medium ml-2">{o.status.label}</span>
                </div>
              ))}
            </div>
          )}
          {upcomingBirthdays.length > 0 && (
            <div className="pt-3 border-t border-[#F0DFCF]">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2 flex items-center gap-1"><Gift className="w-3 h-3" /> Дни рождения скоро</p>
              <div className="space-y-1.5">
                {upcomingBirthdays.slice(0, 4).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                    <span className="truncate">{c.name}</span>
                    <span className="shrink-0 ml-2">{c.daysToBirthday === 0 ? "сегодня!" : `через ${c.daysToBirthday} дн.`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone, icon: Icon, onClick }) {
  const tones = {
    rose: "text-rose-700 bg-rose-50 border-rose-200",
    teal: "text-teal-700 bg-teal-50 border-teal-200",
    overdue: "text-red-700 bg-red-50 border-red-200",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
    gold: "text-amber-800 bg-amber-100 border-amber-300",
  };
  return (
    <button onClick={onClick} className={`text-left rounded-2xl p-4 border transition hover:brightness-95 ${tones[tone]}`}>
      <Icon className="w-4 h-4 mb-3 opacity-80" />
      <div className="font-display text-2xl font-semibold">{value}</div>
      <div className="text-xs mt-0.5 opacity-80">{label}</div>
    </button>
  );
}

// ================= Orders board =================
function OrdersBoard({ orders, clients, addOrder, moveOrder, deleteOrder }) {
  const [showForm, setShowForm] = useState(false);
  const [useExisting, setUseExisting] = useState(true);
  const [form, setForm] = useState({
    clientId: clients[0]?.id || "", newClientName: "", newClientPhone: "",
    product: "", productType: PRODUCT_TYPES[0], size: "", filling: "", price: "", prepaid: "",
    fulfillment: FULFILLMENT_TYPES[0], address: "", dueDate: todayISO(), dueTime: "12:00", comment: "",
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.product.trim()) return;
    if (useExisting && !form.clientId) return;
    if (!useExisting && !form.newClientName.trim()) return;
    addOrder({ ...form, clientId: useExisting ? form.clientId : null });
    setForm(f => ({ ...f, product: "", size: "", filling: "", price: "", prepaid: "", address: "", comment: "", newClientName: "", newClientPhone: "" }));
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold mb-1">Заказы</h1>
          <p className="text-[#8B6F5C] text-sm">От создания заказа до выдачи клиенту</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition">
          <Plus className="w-4 h-4" /> Новый заказ
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-[#F0DFCF] rounded-2xl p-4 mb-6 grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 flex gap-2 mb-1">
            <button type="button" onClick={() => setUseExisting(true)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${useExisting ? "bg-rose-50 border-rose-200 text-rose-700" : "border-[#F0DFCF] text-[#8B6F5C]"}`}>Существующий клиент</button>
            <button type="button" onClick={() => setUseExisting(false)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${!useExisting ? "bg-rose-50 border-rose-200 text-rose-700" : "border-[#F0DFCF] text-[#8B6F5C]"}`}>Новый клиент</button>
          </div>

          {useExisting ? (
            <select required value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
              className="sm:col-span-2 bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400">
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
            </select>
          ) : (
            <>
              <input required placeholder="Имя нового клиента" value={form.newClientName}
                onChange={e => setForm(f => ({ ...f, newClientName: e.target.value }))}
                className="bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400" />
              <input placeholder="Телефон" value={form.newClientPhone}
                onChange={e => setForm(f => ({ ...f, newClientPhone: e.target.value }))}
                className="bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400" />
            </>
          )}

          <input required placeholder="Название изделия (напр. Торт «Красный бархат»)" value={form.product}
            onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
            className="sm:col-span-2 bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400" />
          <select value={form.productType} onChange={e => setForm(f => ({ ...f, productType: e.target.value }))}
            className="bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400">
            {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Вес / размер / кол-во" value={form.size}
            onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
            className="bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400" />
          <input placeholder="Начинка / вкус" value={form.filling}
            onChange={e => setForm(f => ({ ...f, filling: e.target.value }))}
            className="bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400" />
          <input type="number" placeholder="Цена, ₸" value={form.price}
            onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            className="bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400" />
          <input type="number" placeholder="Предоплата, ₸" value={form.prepaid}
            onChange={e => setForm(f => ({ ...f, prepaid: e.target.value }))}
            className="bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400" />
          <select value={form.fulfillment} onChange={e => setForm(f => ({ ...f, fulfillment: e.target.value }))}
            className="bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400">
            {FULFILLMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {form.fulfillment === "Доставка" && (
            <input placeholder="Адрес доставки" value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="sm:col-span-2 bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400" />
          )}
          <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
            className="bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400" />
          <input type="time" value={form.dueTime} onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))}
            className="bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400" />
          <textarea placeholder="Комментарий: надпись на торте, макет, пожелания" value={form.comment}
            onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} rows={2}
            className="sm:col-span-2 bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400 resize-none" />
          <button className="sm:col-span-2 bg-rose-600 hover:bg-rose-500 text-white font-medium py-2 rounded-lg text-sm">Создать заказ</button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {ORDER_STAGES.map((stage, stageIdx) => (
          <div key={stage.id} className="bg-white/60 border border-[#F0DFCF] rounded-2xl p-3 min-h-[200px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#8B6F5C]">{stage.label}</span>
              <span className="text-xs text-[#8B6F5C]">{orders.filter(o => o.stage === stage.id).length}</span>
            </div>
            <div className="space-y-2">
              {orders.filter(o => o.stage === stage.id).map(order => (
                <div key={order.id} className={`bg-white border rounded-xl p-3 group ${order.status.tone === "overdue" ? "border-rose-300" : "border-[#F0DFCF]"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{order.clientName}</p>
                    <button onClick={() => deleteOrder(order.id)} className="opacity-0 group-hover:opacity-100 text-[#C9BBA8] hover:text-rose-500 transition shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-[#8B6F5C] mt-1">{order.product}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${TONE_STYLES[order.status.tone]}`}>{order.status.label}</span>
                  </div>
                  <p className="text-xs text-rose-600 font-medium mt-1.5">{fmtMoney(order.price)}{order.prepaid > 0 && <span className="text-[#8B6F5C] font-normal"> · предоплата {fmtMoney(order.prepaid)}</span>}</p>
                  <p className="text-xs text-[#8B6F5C] mt-1 flex items-center gap-1">
                    {order.fulfillment === "Доставка" ? <Truck className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                    {order.fulfillment === "Доставка" ? order.address : "Самовывоз"}
                  </p>
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex gap-1">
                      {stageIdx > 0 && (
                        <button onClick={() => moveOrder(order.id, -1)} className="text-xs text-[#C9BBA8] hover:text-[#8B6F5C] px-1">←</button>
                      )}
                      {stageIdx < ORDER_STAGES.length - 1 && (
                        <button onClick={() => moveOrder(order.id, 1)} className="text-xs text-rose-600 hover:text-rose-500 flex items-center gap-0.5">
                          Далее <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ================= Deliveries (day agenda) =================
function DeliveriesView({ orders, markDelivered }) {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const dayOrders = orders.filter(o => o.dueDate === selectedDate && o.stage !== "completed").sort((a, b) => (a.dueTime || "").localeCompare(b.dueTime || ""));
  const shiftDate = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };
  const isToday = selectedDate === todayISO();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold mb-1">Доставки и самовывоз</h1>
        <p className="text-[#8B6F5C] text-sm">План выдачи заказов на день</p>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => shiftDate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-[#F0DFCF] text-[#8B6F5C] hover:text-[#3B2417]">←</button>
        <div className="flex items-center gap-2 bg-white border border-[#F0DFCF] rounded-lg px-3 py-1.5">
          <Calendar className="w-3.5 h-3.5 text-rose-500" />
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent text-sm outline-none" />
          {isToday && <span className="text-xs text-rose-600 font-medium">Сегодня</span>}
        </div>
        <button onClick={() => shiftDate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-[#F0DFCF] text-[#8B6F5C] hover:text-[#3B2417]">→</button>
        <span className="text-sm text-[#8B6F5C] ml-1">{dayOrders.length} заказ(ов) к выдаче</span>
      </div>

      {dayOrders.length === 0 ? (
        <div className="text-center py-16 text-[#8B6F5C] text-sm">На этот день выдач не запланировано.</div>
      ) : (
        <div className="space-y-2.5">
          {dayOrders.map(o => (
            <div key={o.id} className={`rounded-2xl border p-4 bg-white ${o.status.tone === "overdue" ? "border-rose-300" : "border-[#F0DFCF]"}`}>
              <div className="flex items-start gap-4">
                <div className={`shrink-0 w-14 h-8 rounded-xl border flex items-center justify-center font-display text-xs font-semibold ${TONE_STYLES[o.status.tone]}`}>
                  {o.dueTime || "—"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{o.clientName}</p>
                    <button onClick={() => markDelivered(o.id)} className="flex items-center gap-1 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-100 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Выдано
                    </button>
                  </div>
                  <p className="text-xs text-[#8B6F5C] mt-1">{o.product} {o.size && `· ${o.size}`}</p>
                  <p className="text-xs text-[#8B6F5C] mt-1 flex items-center gap-1">
                    {o.fulfillment === "Доставка" ? <Truck className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                    {o.fulfillment === "Доставка" ? o.address : "Самовывоз из магазина"}
                  </p>
                  {o.comment && <p className="text-xs text-[#8B6F5C] mt-1.5 italic">«{o.comment}»</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ================= Clients view =================
function ClientsView({ clients, orders, updateClient, deleteClient, showToast }) {
  const [selected, setSelected] = useState(clients[0]?.id || null);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const filtered = clients.filter(c => {
    if (filter === "repeat") return c.orderCount > 1;
    if (filter === "new") return c.orderCount <= 1;
    if (filter === "birthday") return c.daysToBirthday !== null && c.daysToBirthday !== undefined && c.daysToBirthday <= 7;
    return true;
  });

  const client = clients.find(c => c.id === selected) || filtered[0] || clients[0];
  const clientOrders = client ? orders.filter(o => o.clientId === client.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];

  useEffect(() => { if (!selected && clients[0]) setSelected(clients[0].id); }, [clients]);
  useEffect(() => { if (client) setEditForm({ phone: client.phone, birthday: client.birthday || "", notes: client.notes || "" }); }, [client?.id]);

  const saveEdit = (e) => {
    e.preventDefault();
    updateClient(client.id, editForm);
    setEditing(false);
    showToast("Данные клиента обновлены");
  };

  if (clients.length === 0) {
    return <div className="text-center py-20 text-[#8B6F5C] text-sm">Клиенты появятся автоматически при создании первого заказа.</div>;
  }

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-5">
      <div>
        <h2 className="font-display font-semibold mb-3">Клиенты</h2>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {CLIENT_FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${filter === f.id ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-white border-[#F0DFCF] text-[#8B6F5C] hover:border-[#E0C9AE]"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          {filtered.length === 0 && <p className="text-xs text-[#8B6F5C] px-1 py-3">Нет клиентов с этим фильтром.</p>}
          {filtered.map(c => (
            <button key={c.id} onClick={() => setSelected(c.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border transition flex items-center justify-between gap-2 ${selected === c.id ? "bg-rose-50 border-rose-200" : "bg-white border-[#F0DFCF] hover:border-[#E0C9AE]"}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs text-[#8B6F5C]">{c.orderCount} заказ(ов)</p>
              </div>
              {c.daysToBirthday !== null && c.daysToBirthday !== undefined && c.daysToBirthday <= 7 && <Gift className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {client && (
        <div>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-semibold">{client.name}</h2>
              <p className="text-sm text-[#8B6F5C] flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{client.phone}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(v => !v)} className="text-xs bg-white border border-[#F0DFCF] px-3 py-1.5 rounded-lg font-medium hover:border-[#E0C9AE]">
                {editing ? "Отмена" : "Редактировать"}
              </button>
              <button onClick={() => deleteClient(client.id)} className="text-[#C9BBA8] hover:text-rose-500 px-2"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>

          {editing ? (
            <form onSubmit={saveEdit} className="bg-white border border-[#F0DFCF] rounded-2xl p-4 mb-5 grid sm:grid-cols-2 gap-3">
              <input placeholder="Телефон" value={editForm.phone}
                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                className="bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400" />
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-500 shrink-0" />
                <input type="date" value={editForm.birthday}
                  onChange={e => setEditForm(f => ({ ...f, birthday: e.target.value }))}
                  className="flex-1 bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400" />
              </div>
              <textarea placeholder="Заметки: предпочтения, аллергии" value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="sm:col-span-2 bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400 resize-none" />
              <button className="sm:col-span-2 bg-rose-600 text-white font-medium py-2 rounded-lg text-sm">Сохранить</button>
            </form>
          ) : (
            <div className="bg-white border border-[#F0DFCF] rounded-2xl p-4 mb-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5 text-[#8B6F5C]"><Gift className="w-3.5 h-3.5 text-amber-500" /> {client.birthday ? fmtDateShort(client.birthday) : "не указан"}{client.daysToBirthday !== null && client.daysToBirthday !== undefined && client.daysToBirthday <= 7 && <span className="text-amber-600 font-medium ml-1">— через {client.daysToBirthday} дн.!</span>}</span>
              {client.notes && <span className="text-[#8B6F5C]">{client.notes}</span>}
            </div>
          )}

          <p className="text-xs font-semibold uppercase tracking-wide text-[#8B6F5C] mb-2">История заказов</p>
          {clientOrders.length === 0 ? (
            <p className="text-sm text-[#8B6F5C]">Заказов пока не было.</p>
          ) : (
            <div className="space-y-2">
              {clientOrders.map(o => {
                const status = o.status;
                return (
                  <div key={o.id} className="bg-white border border-[#F0DFCF] rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{o.product}</p>
                      <p className="text-xs text-[#8B6F5C] mt-0.5">{fmtDateShort(o.dueDate)} · {fmtMoney(o.price)}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg border shrink-0 ${TONE_STYLES[status.tone]}`}>{status.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ================= Login =================
function LoginScreen({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { accessToken } = await api.login(username, password);
      localStorage.setItem("balgyn:token", accessToken);
      await onLoggedIn();
    } catch (err) {
      setError("Неверный логин или пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF3EC] flex items-center justify-center p-6">
      <form onSubmit={submit} className="bg-white border border-[#F0DFCF] rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <div className="w-9 h-9 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center">
            <Cake className="w-5 h-5 text-rose-600" />
          </div>
          <span className="font-display font-semibold text-lg">Balgyn Bakery CRM</span>
        </div>

        <label className="text-xs text-[#8B6F5C] mb-1 block">Логин</label>
        <input required value={username} onChange={e => setUsername(e.target.value)} autoFocus
          className="w-full bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400 mb-3" />

        <label className="text-xs text-[#8B6F5C] mb-1 block">Пароль</label>
        <input required type="password" value={password} onChange={e => setPassword(e.target.value)}
          className="w-full bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400 mb-4" />

        {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}

        <button disabled={loading}
          className="w-full bg-rose-600 hover:bg-rose-500 text-white font-medium py-2 rounded-lg text-sm disabled:opacity-60">
          {loading ? "Входим..." : "Войти"}
        </button>

        <p className="text-xs text-[#8B6F5C] text-center mt-4">
          Демо-доступы (пароль у всех <span className="font-medium">balgyn2026</span>):
          {" "}<span className="font-medium">director</span> (Директор) ·{" "}
          <span className="font-medium">rop</span> (РОП) ·{" "}
          <span className="font-medium">manager</span> (Менеджер)
        </p>
      </form>
    </div>
  );
}

// ================= Employees (director only) =================
function EmployeesView({ showToast }) {
  const [employees, setEmployees] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", fullName: "", role: "manager" });

  useEffect(() => {
    api.getUsers().then(setEmployees).catch(() => setEmployees([]));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) return;
    try {
      const created = await api.createUser(form);
      setEmployees(prev => [...prev, created]);
      setForm({ username: "", password: "", fullName: "", role: "manager" });
      setShowForm(false);
      showToast("Сотрудник добавлен");
    } catch (err) {
      showToast("Не удалось создать сотрудника (логин занят?)");
    }
  };

  const changeRole = async (id, newRole) => {
    try {
      const updated = await api.updateUser(id, { role: newRole });
      setEmployees(prev => prev.map(e => e.id === id ? updated : e));
    } catch (err) { console.error(err); }
  };

  const removeEmployee = async (id) => {
    try {
      await api.deleteUser(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      showToast("Не удалось удалить сотрудника");
    }
  };

  if (employees === null) {
    return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 text-rose-500 animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold mb-1">Сотрудники</h1>
          <p className="text-[#8B6F5C] text-sm">Учётные записи и роли — доступно только директору</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition">
          <Plus className="w-4 h-4" /> Новый сотрудник
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-[#F0DFCF] rounded-2xl p-4 mb-6 grid sm:grid-cols-2 gap-3">
          <input required placeholder="Логин" value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            className="bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400" />
          <input required type="password" placeholder="Пароль" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400" />
          <input placeholder="Имя сотрудника" value={form.fullName}
            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
            className="bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400" />
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            className="bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400">
            {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <button className="sm:col-span-2 bg-rose-600 text-white font-medium py-2 rounded-lg text-sm">Создать учётную запись</button>
        </form>
      )}

      <div className="space-y-2">
        {employees.map(emp => (
          <div key={emp.id} className="bg-white border border-[#F0DFCF] rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{emp.fullName || emp.username}</p>
              <p className="text-xs text-[#8B6F5C]">Логин: {emp.username}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select value={emp.role} onChange={e => changeRole(emp.id, e.target.value)}
                className="bg-[#FBF3EC] border border-[#F0DFCF] rounded-lg px-2 py-1 text-xs outline-none focus:border-rose-400">
                {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <button onClick={() => removeEmployee(emp.id)} className="text-[#C9BBA8] hover:text-rose-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
