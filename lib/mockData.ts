// Mock data for GROWICE dashboard

export const revenueData = [
  { month: "Мар", revenue: 284000, expenses: 142000, profit: 142000 },
  { month: "Апр", revenue: 315000, expenses: 158000, profit: 157000 },
  { month: "Май", revenue: 298000, expenses: 149000, profit: 149000 },
  { month: "Июн", revenue: 342000, expenses: 171000, profit: 171000 },
  { month: "Июл", revenue: 389000, expenses: 185000, profit: 204000 },
  { month: "Авг", revenue: 421000, expenses: 198000, profit: 223000 },
  { month: "Сен", revenue: 378000, expenses: 178000, profit: 200000 },
  { month: "Окт", revenue: 456000, expenses: 210000, profit: 246000 },
  { month: "Ноя", revenue: 412000, expenses: 195000, profit: 217000 },
  { month: "Дек", revenue: 498000, expenses: 225000, profit: 273000 },
  { month: "Янв", revenue: 387000, expenses: 182000, profit: 205000 },
  { month: "Фев", revenue: 443000, expenses: 208000, profit: 235000 },
];

export const servicesData = [
  { name: "Стрижка", value: 32, color: "#00FF00" },
  { name: "Окрашивание", value: 28, color: "#88CC00" },
  { name: "Маникюр", value: 18, color: "#66AA00" },
  { name: "Педикюр", value: 12, color: "#448800" },
  { name: "Брови/Ресницы", value: 10, color: "#226600" },
];

export const appointmentsByDay = [
  { day: "Пн", appointments: 24 },
  { day: "Вт", appointments: 31 },
  { day: "Ср", appointments: 28 },
  { day: "Чт", appointments: 35 },
  { day: "Пт", appointments: 42 },
  { day: "Сб", appointments: 48 },
  { day: "Вс", appointments: 18 },
];

export const appointmentsByHour = [
  { hour: "9:00", count: 8 },
  { hour: "10:00", count: 15 },
  { hour: "11:00", count: 19 },
  { hour: "12:00", count: 12 },
  { hour: "13:00", count: 7 },
  { hour: "14:00", count: 18 },
  { hour: "15:00", count: 22 },
  { hour: "16:00", count: 25 },
  { hour: "17:00", count: 21 },
  { hour: "18:00", count: 16 },
  { hour: "19:00", count: 10 },
  { hour: "20:00", count: 5 },
];

export const clientsData = [
  {
    id: 1,
    name: "Алина Соколова",
    phone: "+7 (916) 234-56-78",
    email: "a.sokolova@mail.ru",
    visits: 18,
    lastVisit: "12.02.2026",
    totalSpent: 84600,
    ltv: 94000,
    status: "VIP",
    source: "Instagram",
    avatar: "АС",
  },
  {
    id: 2,
    name: "Мария Иванова",
    phone: "+7 (903) 456-78-90",
    email: "m.ivanova@gmail.com",
    visits: 12,
    lastVisit: "18.02.2026",
    totalSpent: 56400,
    ltv: 62000,
    status: "Постоянный",
    source: "Рекомендация",
    avatar: "МИ",
  },
  {
    id: 3,
    name: "Екатерина Петрова",
    phone: "+7 (926) 789-01-23",
    email: "e.petrova@yandex.ru",
    visits: 8,
    lastVisit: "20.02.2026",
    totalSpent: 37200,
    ltv: 41000,
    status: "Постоянный",
    source: "ВКонтакте",
    avatar: "ЕП",
  },
  {
    id: 4,
    name: "Ольга Сидорова",
    phone: "+7 (967) 012-34-56",
    email: "o.sidorova@mail.ru",
    visits: 5,
    lastVisit: "15.02.2026",
    totalSpent: 23500,
    ltv: 28000,
    status: "Новый",
    source: "2GIS",
    avatar: "ОС",
  },
  {
    id: 5,
    name: "Наталья Козлова",
    phone: "+7 (977) 345-67-89",
    email: "n.kozlova@gmail.com",
    visits: 22,
    lastVisit: "22.02.2026",
    totalSpent: 103400,
    ltv: 115000,
    status: "VIP",
    source: "Instagram",
    avatar: "НК",
  },
  {
    id: 6,
    name: "Анастасия Новикова",
    phone: "+7 (916) 678-90-12",
    email: "a.novikova@yandex.ru",
    visits: 3,
    lastVisit: "08.02.2026",
    totalSpent: 12600,
    ltv: 15000,
    status: "Новый",
    source: "Google",
    avatar: "АН",
  },
  {
    id: 7,
    name: "Татьяна Морозова",
    phone: "+7 (903) 901-23-45",
    email: "t.morozova@mail.ru",
    visits: 15,
    lastVisit: "19.02.2026",
    totalSpent: 71250,
    ltv: 79000,
    status: "Постоянный",
    source: "Рекомендация",
    avatar: "ТМ",
  },
  {
    id: 8,
    name: "Юлия Волкова",
    phone: "+7 (926) 234-56-78",
    email: "y.volkova@gmail.com",
    visits: 7,
    lastVisit: "23.02.2026",
    totalSpent: 32900,
    ltv: 37000,
    status: "Постоянный",
    source: "ВКонтакте",
    avatar: "ЮВ",
  },
];

export const appointmentsData = [
  {
    id: 1,
    client: "Алина Соколова",
    service: "Окрашивание + стрижка",
    master: "Карина Белова",
    date: "25.02.2026",
    time: "10:00",
    duration: "3ч",
    price: 8500,
    status: "Подтверждено",
  },
  {
    id: 2,
    client: "Мария Иванова",
    service: "Маникюр гель-лак",
    master: "Дарья Орлова",
    date: "25.02.2026",
    time: "11:30",
    duration: "2ч",
    price: 3200,
    status: "Подтверждено",
  },
  {
    id: 3,
    client: "Наталья Козлова",
    service: "Стрижка + укладка",
    master: "Карина Белова",
    date: "25.02.2026",
    time: "14:00",
    duration: "1.5ч",
    price: 4800,
    status: "Ожидание",
  },
  {
    id: 4,
    client: "Ольга Сидорова",
    service: "Педикюр",
    master: "Дарья Орлова",
    date: "26.02.2026",
    time: "09:30",
    duration: "1.5ч",
    price: 2900,
    status: "Подтверждено",
  },
  {
    id: 5,
    client: "Екатерина Петрова",
    service: "Ламинирование бровей",
    master: "Анна Титова",
    date: "26.02.2026",
    time: "12:00",
    duration: "1ч",
    price: 2400,
    status: "Отменено",
  },
  {
    id: 6,
    client: "Юлия Волкова",
    service: "Маникюр + покрытие",
    master: "Дарья Орлова",
    date: "26.02.2026",
    time: "15:00",
    duration: "2ч",
    price: 3600,
    status: "Ожидание",
  },
  {
    id: 7,
    client: "Татьяна Морозова",
    service: "Окрашивание (балаяж)",
    master: "Карина Белова",
    date: "27.02.2026",
    time: "10:30",
    duration: "4ч",
    price: 12000,
    status: "Подтверждено",
  },
  {
    id: 8,
    client: "Анастасия Новикова",
    service: "Стрижка",
    master: "Лена Смирнова",
    date: "27.02.2026",
    time: "13:00",
    duration: "1ч",
    price: 2200,
    status: "Подтверждено",
  },
];

export const staffData = [
  {
    id: 1,
    name: "Карина Белова",
    role: "Мастер-колорист",
    avatar: "КБ",
    clients: 145,
    revenue: 187400,
    rating: 4.9,
    workload: 88,
    appointments: 62,
    avgCheck: 6240,
    color: "#00FF00",
  },
  {
    id: 2,
    name: "Дарья Орлова",
    role: "Мастер маникюра",
    avatar: "ДО",
    clients: 198,
    revenue: 142300,
    rating: 4.8,
    workload: 92,
    appointments: 89,
    avgCheck: 3180,
    color: "#88CC00",
  },
  {
    id: 3,
    name: "Анна Титова",
    role: "Мастер бровей",
    avatar: "АТ",
    clients: 112,
    revenue: 98600,
    rating: 4.7,
    workload: 75,
    appointments: 71,
    avgCheck: 2480,
    color: "#66AA00",
  },
  {
    id: 4,
    name: "Лена Смирнова",
    role: "Универсальный мастер",
    avatar: "ЛС",
    clients: 87,
    revenue: 76200,
    rating: 4.6,
    workload: 68,
    appointments: 48,
    avgCheck: 3200,
    color: "#448800",
  },
];

export const staffRevenueData = staffData.map((s) => ({
  name: s.name.split(" ")[0],
  revenue: s.revenue,
  clients: s.clients,
}));

export const clientSourcesData = [
  { name: "Instagram", value: 38, color: "#00FF00" },
  { name: "Рекомендации", value: 27, color: "#88CC00" },
  { name: "ВКонтакте", value: 16, color: "#66AA00" },
  { name: "2GIS/Google", value: 12, color: "#448800" },
  { name: "Другое", value: 7, color: "#2a4400" },
];

export const recentActivity = [
  {
    id: 1,
    type: "appointment",
    text: "Новая запись — Алина Соколова на окрашивание",
    time: "5 мин назад",
    amount: 8500,
  },
  {
    id: 2,
    type: "client",
    text: "Новый клиент — Юлия Волкова зарегистрирована",
    time: "23 мин назад",
    amount: null,
  },
  {
    id: 3,
    type: "payment",
    text: "Оплата получена — Наталья Козлова",
    time: "1ч 12 мин назад",
    amount: 4800,
  },
  {
    id: 4,
    type: "cancel",
    text: "Отмена записи — Екатерина Петрова",
    time: "2ч 30 мин назад",
    amount: -2400,
  },
  {
    id: 5,
    type: "payment",
    text: "Оплата получена — Мария Иванова",
    time: "3ч 15 мин назад",
    amount: 3200,
  },
];

export const dashboardKPIs = {
  monthlyRevenue: 443000,
  monthlyRevenueGrowth: 14.5,
  newClients: 38,
  newClientsGrowth: 8.2,
  totalAppointments: 226,
  appointmentsGrowth: 11.3,
  avgCheck: 3750,
  avgCheckGrowth: 2.8,
};

export const financesKPIs = {
  arr: 5316000,
  mrr: 443000,
  momGrowth: 14.5,
  avgCheck: 3750,
  totalRevenue: 4622000,
  totalExpenses: 2001000,
  totalProfit: 2621000,
};

export const serviceRevenueData = [
  { service: "Стрижка", revenue: 124000, count: 112 },
  { service: "Окрашивание", revenue: 198000, count: 58 },
  { service: "Маникюр", revenue: 78400, count: 98 },
  { service: "Педикюр", revenue: 52000, count: 62 },
  { service: "Брови", revenue: 42600, count: 72 },
];

export const clientsKPIs = {
  total: 547,
  newThisMonth: 38,
  retentionRate: 78.4,
  avgLTV: 52400,
};

// ─── MARKETING / CRM ─────────────────────────────────────────────────────────

export const marketingClients = [
  { id: 1, name: "Алина Соколова", phone: "+7 (916) 234-56-78", gender: "Ж", revenue: 84600, channel: "Instagram", telegram: "@a_sokolova", lastContact: "12.02.2026", services: ["Окрашивание", "Стрижка"] },
  { id: 2, name: "Мария Иванова", phone: "+7 (903) 456-78-90", gender: "Ж", revenue: 56400, channel: "WhatsApp", telegram: "@m_ivanova", lastContact: "18.02.2026", services: ["Маникюр"] },
  { id: 3, name: "Дмитрий Волков", phone: "+7 (926) 789-01-23", gender: "М", revenue: 22300, channel: "2ГИС", telegram: null, lastContact: "20.02.2026", services: ["Стрижка"] },
  { id: 4, name: "Ольга Сидорова", phone: "+7 (967) 012-34-56", gender: "Ж", revenue: 23500, channel: "Telegram", telegram: "@o_sidorova", lastContact: "15.02.2026", services: ["Педикюр"] },
  { id: 5, name: "Наталья Козлова", phone: "+7 (977) 345-67-89", gender: "Ж", revenue: 103400, channel: "Instagram", telegram: "@nat_kozlova", lastContact: "22.02.2026", services: ["Окрашивание", "Маникюр", "Стрижка"] },
  { id: 6, name: "Анастасия Новикова", phone: "+7 (916) 678-90-12", gender: "Ж", revenue: 12600, channel: "Google", telegram: null, lastContact: "08.02.2026", services: ["Брови"] },
  { id: 7, name: "Алексей Морозов", phone: "+7 (903) 901-23-45", gender: "М", revenue: 31250, channel: "Рекомендация", telegram: "@alex_m", lastContact: "19.02.2026", services: ["Стрижка"] },
  { id: 8, name: "Юлия Волкова", phone: "+7 (926) 234-56-78", gender: "Ж", revenue: 32900, channel: "ВКонтакте", telegram: "@y_volkova", lastContact: "23.02.2026", services: ["Маникюр", "Педикюр"] },
  { id: 9, name: "Сергей Петров", phone: "+7 (916) 555-44-33", gender: "М", revenue: 18700, channel: "WhatsApp", telegram: "@s_petrov", lastContact: "21.02.2026", services: ["Стрижка"] },
  { id: 10, name: "Татьяна Морозова", phone: "+7 (903) 901-23-45", gender: "Ж", revenue: 71250, channel: "Рекомендация", telegram: null, lastContact: "19.02.2026", services: ["Окрашивание", "Стрижка"] },
];

export const autoSystems = [
  {
    id: 1, name: "Не дозвонились",
    description: "Сообщение клиентам, которым не удалось дозвониться",
    status: "active", trigger: "call_failed",
    stats: { sent: 43, responded: 18, converted: 12 }, lastRun: "25.02.2026",
  },
  {
    id: 2, name: "Не был 50 дней",
    description: "Напоминание клиентам, не посещавшим салон 50+ дней",
    status: "active", trigger: "inactive_50_days",
    stats: { sent: 87, responded: 31, converted: 24 }, lastRun: "24.02.2026",
  },
  {
    id: 3, name: "После визита",
    description: "Запрос отзыва через 24 часа после визита",
    status: "active", trigger: "after_visit",
    stats: { sent: 226, responded: 142, converted: 98 }, lastRun: "25.02.2026",
  },
];

// ─── SYSTEM & PAYMENT ────────────────────────────────────────────────────────

export const subscriptionData = {
  plan: "Voice-Pro", status: "Активна", paidUntil: "01.04.2026", daysLeft: 35,
};

export const pricingPlans = [
  { id: "text", name: "Text", price: 5900, features: ["Чат-бот и FAQ", "Базовые рассылки", "До 500 сообщений/мес", "Поддержка по email"] },
  { id: "voice-start", name: "Voice-Start", price: 9900, features: ["Всё из Text", "Базовые голосовые сценарии", "Входящие звонки", "До 2 000 сообщений/мес"] },
  { id: "voice-pro", name: "Voice-Pro", price: 14900, popular: true, features: ["Всё из Voice-Start", "Расширенная голосовая логика", "CRM-интеграции", "Аналитика звонков"] },
  { id: "voice-max", name: "Voice-Max", price: 21900, features: ["Всё из Voice-Pro", "Максимальный пакет", "Приоритетная поддержка SLA", "Выделенный менеджер"] },
];

export const systemModules = [
  { id: "reminders", name: "Автоматические напоминания", enabled: true, group: "auto" },
  { id: "telegram-mod", name: "Модератор Telegram-канала", enabled: false, group: "auto" },
  { id: "telegram", name: "Telegram", enabled: true, group: "channel" },
  { id: "whatsapp", name: "WhatsApp", enabled: false, group: "channel" },
  { id: "max", name: "Max", enabled: false, group: "channel" },
];

// ─── SETTINGS ────────────────────────────────────────────────────────────────

export const profileSettings = { name: "Иван Петров", phone: "+7 (999) 123-45-67", role: "Владелец" };

export const orgSettings = {
  name: "Салон красоты GROWICE",
  address: "г. Москва, ул. Тверская, 1",
  yandexMapsUrl: "https://yandex.ru/maps",
  dgisUrl: "https://2gis.ru",
  admins: ["Карина Белова", "Дарья Орлова", ""],
};

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

export const analyticsKPIs = {
  revenue: 443000, revenueAvgDay: 15821,
  appointments: 226, appointmentsAvgDay: 8,
  conversionRate: 32.5, avgCheck: 3750,
  noShowCount: 18, noShowPercent: 8.0,
  messagesPerContact: 4.2, retention: 78.4,
  incomingMessages: 847, outgoingMessages: 1124,
  offHoursAppointments: 42, timeSaved: 118,
  reactivated: 24, avgResponseTime: "1м 23с",
};

export const dailyContactsData = [
  { date: "1 фев", contacts: 18 }, { date: "2 фев", contacts: 22 }, { date: "3 фев", contacts: 15 },
  { date: "4 фев", contacts: 28 }, { date: "5 фев", contacts: 31 }, { date: "6 фев", contacts: 24 },
  { date: "7 фев", contacts: 19 }, { date: "8 фев", contacts: 33 }, { date: "9 фев", contacts: 29 },
  { date: "10 фев", contacts: 26 }, { date: "11 фев", contacts: 21 }, { date: "12 фев", contacts: 34 },
  { date: "13 фев", contacts: 27 }, { date: "14 фев", contacts: 52 }, { date: "15 фев", contacts: 42 },
  { date: "16 фев", contacts: 35 }, { date: "17 фев", contacts: 28 }, { date: "18 фев", contacts: 31 },
  { date: "19 фев", contacts: 24 }, { date: "20 фев", contacts: 36 }, { date: "21 фев", contacts: 29 },
  { date: "22 фев", contacts: 41 }, { date: "23 фев", contacts: 22 }, { date: "24 фев", contacts: 38 },
  { date: "25 фев", contacts: 44 }, { date: "26 фев", contacts: 37 }, { date: "27 фев", contacts: 30 },
  { date: "28 фев", contacts: 33 },
];

export const cancellationsData = [
  { type: "Отмена за день", count: 24, color: "#f87171" },
  { type: "Отмена за час", count: 18, color: "#fb923c" },
  { type: "Не пришёл", count: 18, color: "#fbbf24" },
  { type: "Позвонил и отменил", count: 11, color: "#a78bfa" },
];

export const noShowData = [
  { date: "19/02", came: 7, noShow: 1 }, { date: "20/02", came: 10, noShow: 1 },
  { date: "21/02", came: 8, noShow: 1 }, { date: "22/02", came: 12, noShow: 1 },
  { date: "23/02", came: 6, noShow: 1 }, { date: "24/02", came: 10, noShow: 2 },
  { date: "25/02", came: 13, noShow: 1 },
];

export const dailyKPITable = [
  { date: "25.02.2026", contacts: 44, messages: 187, appointments: 14, revenue: 52400, noShow: 1 },
  { date: "24.02.2026", contacts: 38, messages: 162, appointments: 12, revenue: 44800, noShow: 2 },
  { date: "23.02.2026", contacts: 22, messages: 94, appointments: 7, revenue: 26200, noShow: 0 },
  { date: "22.02.2026", contacts: 41, messages: 174, appointments: 13, revenue: 48600, noShow: 1 },
  { date: "21.02.2026", contacts: 29, messages: 123, appointments: 9, revenue: 33700, noShow: 2 },
  { date: "20.02.2026", contacts: 36, messages: 153, appointments: 11, revenue: 41200, noShow: 0 },
  { date: "19.02.2026", contacts: 24, messages: 102, appointments: 8, revenue: 29900, noShow: 1 },
];

export const topDaysByRevenue = [
  { date: "14.02.2026", revenue: 68400, appointments: 18, contacts: 52 },
  { date: "08.02.2026", revenue: 61200, appointments: 16, contacts: 47 },
  { date: "25.02.2026", revenue: 52400, appointments: 14, contacts: 44 },
  { date: "01.02.2026", revenue: 49800, appointments: 13, contacts: 41 },
  { date: "22.02.2026", revenue: 48600, appointments: 13, contacts: 41 },
];

export const topDaysByAppointments = [
  { date: "15.02.2026", appointments: 19, revenue: 71200, noShow: 2 },
  { date: "14.02.2026", appointments: 18, revenue: 68400, noShow: 1 },
  { date: "08.02.2026", appointments: 16, revenue: 61200, noShow: 0 },
  { date: "25.02.2026", appointments: 14, revenue: 52400, noShow: 1 },
  { date: "22.02.2026", appointments: 13, revenue: 48600, noShow: 1 },
];

export const serviceAnalyticsData = [
  { name: "Окрашивание", revenue: 198000, count: 58, avgCheck: 3414 },
  { name: "Стрижка", revenue: 124000, count: 112, avgCheck: 1107 },
  { name: "Маникюр", revenue: 78400, count: 98, avgCheck: 800 },
  { name: "Педикюр", revenue: 52000, count: 62, avgCheck: 839 },
  { name: "Брови/Ресницы", revenue: 42600, count: 72, avgCheck: 592 },
];

// ─── CLIENTS: SEGMENTS + PREDICTIVE SCORING ──────────────────────────────────
export const clientPredictive: Record<number, { score: number; segment: string; churnRisk: "low" | "medium" | "high" }> = {
  1: { score: 92, segment: "VIP",      churnRisk: "low" },
  2: { score: 74, segment: "active",   churnRisk: "medium" },
  3: { score: 61, segment: "active",   churnRisk: "medium" },
  4: { score: 45, segment: "atRisk",   churnRisk: "high" },
  5: { score: 97, segment: "VIP",      churnRisk: "low" },
  6: { score: 28, segment: "inactive", churnRisk: "high" },
  7: { score: 55, segment: "active",   churnRisk: "medium" },
  8: { score: 68, segment: "active",   churnRisk: "medium" },
  9: { score: 42, segment: "atRisk",   churnRisk: "high" },
  10:{ score: 81, segment: "active",   churnRisk: "low" },
};

// ─── APPOINTMENTS: CONVERSION FUNNEL ─────────────────────────────────────────
export const appointmentsFunnel = [
  { stage: "Входящие обращения", count: 695 },
  { stage: "Создано записей",    count: 226 },
  { stage: "Подтверждено",       count: 198 },
  { stage: "Завершено",          count: 183 },
  { stage: "Оплачено",           count: 176 },
];

// ─── STAFF: KPI + NO-SHOW ────────────────────────────────────────────────────
export const staffKPIData = [
  { masterId: 1, noShowCount: 4, noShowPercent: 6.5,  conversionRate: 82, avgSession: "1ч 48м" },
  { masterId: 2, noShowCount: 7, noShowPercent: 7.9,  conversionRate: 78, avgSession: "1ч 32м" },
  { masterId: 3, noShowCount: 3, noShowPercent: 4.2,  conversionRate: 85, avgSession: "1ч 10м" },
  { masterId: 4, noShowCount: 5, noShowPercent: 10.4, conversionRate: 71, avgSession: "1ч 15м" },
];

// ─── FINANCES: P&L + CASH FLOW ───────────────────────────────────────────────
export const plRevenue = [
  { category: "Стрижки",          current: 124000, prev: 108000 },
  { category: "Окрашивание",      current: 198000, prev: 171000 },
  { category: "Маникюр",          current: 78400,  prev: 72100  },
  { category: "Педикюр",          current: 52000,  prev: 48600  },
  { category: "Брови / Ресницы",  current: 42600,  prev: 40100  },
  { category: "Прочие услуги",    current: 12000,  prev: 10200  },
];

export const plExpenses = [
  { category: "Зарплата мастеров",    current: 118000, prev: 110000 },
  { category: "Аренда",               current: 45000,  prev: 45000  },
  { category: "Материалы",            current: 28000,  prev: 25400  },
  { category: "Маркетинг",            current: 12000,  prev: 9800   },
  { category: "Коммунальные услуги",  current: 8000,   prev: 8000   },
  { category: "Прочее",               current: 7000,   prev: 6400   },
];

export const cashFlowData = [
  { month: "Сен", actual: 200000, forecast: null },
  { month: "Окт", actual: 246000, forecast: null },
  { month: "Ноя", actual: 217000, forecast: null },
  { month: "Дек", actual: 273000, forecast: null },
  { month: "Янв", actual: 205000, forecast: null },
  { month: "Фев", actual: 235000, forecast: null },
  { month: "Мар", actual: null,   forecast: 258000 },
  { month: "Апр", actual: null,   forecast: 274000 },
  { month: "Май", actual: null,   forecast: 298000 },
  { month: "Июн", actual: null,   forecast: 315000 },
];

// ─── ANALYTICS: FUNNEL + TRENDS + FORECAST ───────────────────────────────────
export const analyticsFunnel = [
  { stage: "Охват",             value: 2840, desc: "увидели рекламу / пост" },
  { stage: "Обращения",         value: 695,  desc: "написали в мессенджер" },
  { stage: "Квалифицировано",   value: 412,  desc: "ответили на вопросы" },
  { stage: "Записались",        value: 226,  desc: "создали запись" },
  { stage: "Пришли на визит",   value: 208,  desc: "завершили визит" },
];

export const analyticsTrends = [
  { metric: "Выручка",       current: 443000, previous: 387000, unit: "currency" },
  { metric: "Записи",        current: 226,    previous: 203,    unit: "number"   },
  { metric: "Новые клиенты", current: 38,     previous: 35,     unit: "number"   },
  { metric: "Средний чек",   current: 3750,   previous: 3650,   unit: "currency" },
  { metric: "Конверсия",     current: 32.5,   previous: 29.8,   unit: "percent"  },
  { metric: "Retention",     current: 78.4,   previous: 76.2,   unit: "percent"  },
  { metric: "No-show",       current: 8.0,    previous: 9.5,    unit: "percent"  },
];

export const revenueForecast = [
  { month: "Окт 25", value: 456000, type: "actual"   },
  { month: "Ноя 25", value: 412000, type: "actual"   },
  { month: "Дек 25", value: 498000, type: "actual"   },
  { month: "Янв 26", value: 387000, type: "actual"   },
  { month: "Фев 26", value: 443000, type: "actual"   },
  { month: "Мар 26", value: 468000, type: "forecast" },
  { month: "Апр 26", value: 492000, type: "forecast" },
  { month: "Май 26", value: 531000, type: "forecast" },
  { month: "Июн 26", value: 558000, type: "forecast" },
];

// ─── SYSTEM: CHANNEL MANAGEMENT ──────────────────────────────────────────────
export const channelDetails = [
  { id: "telegram",  name: "Telegram",  icon: "TG", enabled: true,  botName: "@growice_bot", webhookUrl: "https://api.telegram.org/bot.../webhook", workFrom: "08:00", workTo: "22:00", messagesMonth: 847, avgResponse: "1м 23с", connected: true  },
  { id: "whatsapp",  name: "WhatsApp",  icon: "WA", enabled: false, botName: "",             webhookUrl: "",                                          workFrom: "09:00", workTo: "21:00", messagesMonth: 0,   avgResponse: "—",     connected: false },
  { id: "max",       name: "Max",       icon: "МХ", enabled: false, botName: "",             webhookUrl: "",                                          workFrom: "09:00", workTo: "20:00", messagesMonth: 0,   avgResponse: "—",     connected: false },
];

// ─── SETTINGS: ROLES + NOTIFICATIONS ─────────────────────────────────────────
export const rolesData = [
  { id: "owner",  name: "Владелец",        color: "#00FF00", permissions: ["Все разделы", "Настройки", "Оплата", "Роли"],                          members: ["Иван Петров"] },
  { id: "admin",  name: "Администратор",   color: "#60a5fa", permissions: ["Клиенты", "Записи", "Персонал", "Финансы", "Аналитика"],               members: ["Карина Белова", "Дарья Орлова"] },
  { id: "master", name: "Мастер",          color: "#fbbf24", permissions: ["Свои записи", "Свои клиенты"],                                         members: ["Анна Титова", "Лена Смирнова"] },
];

export const notificationsConfig = [
  { id: "new_appointment", label: "Новая запись создана",            telegram: true,  email: false },
  { id: "cancel",          label: "Запись отменена",                 telegram: true,  email: true  },
  { id: "no_show",         label: "Клиент не пришёл",               telegram: true,  email: false },
  { id: "payment",         label: "Оплата получена",                 telegram: false, email: true  },
  { id: "new_client",      label: "Новый клиент зарегистрирован",    telegram: true,  email: false },
  { id: "review",          label: "Получен новый отзыв",             telegram: true,  email: true  },
  { id: "low_balance",     label: "Баланс канала заканчивается",     telegram: true,  email: true  },
  { id: "system_update",   label: "Обновление системы",              telegram: false, email: true  },
];
