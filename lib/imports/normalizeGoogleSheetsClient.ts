type GenericRow = Record<string, unknown>;

export type NormalizedClientRow = {
  org_uid: string;
  yc_id: string | null;
  yclients_id: number | null;
  fullname: string;
  display_name: string;
  name: string | null;
  surname: string | null;
  patronymic: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  sex: string | null;
  comment: string | null;
  discount: number;
  visits: number;
  spent: number;
  paid: number;
  balance: number;
  source: string;
};

function firstDefined(row: GenericRow, keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return null;
}

function toText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const result = String(value).trim();
  return result || null;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function splitName(fullname: string): { name: string | null; surname: string | null; patronymic: string | null } {
  const parts = fullname.split(" ").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return { name: null, surname: null, patronymic: null };
  if (parts.length === 1) return { name: parts[0], surname: null, patronymic: null };
  if (parts.length === 2) return { surname: parts[0], name: parts[1], patronymic: null };
  return { surname: parts[0], name: parts[1], patronymic: parts.slice(2).join(" ") || null };
}

export function normalizeGoogleSheetsClientRow(row: GenericRow, orgUid: string): NormalizedClientRow | null {
  const ycIdRaw = toText(firstDefined(row, ["yc_id", "yclients_id", "id", "client_id"]));
  const numericYc = toNumber(ycIdRaw, NaN);
  const yclientsId = Number.isFinite(numericYc) ? numericYc : null;
  const ycId = ycIdRaw ?? (yclientsId !== null ? String(yclientsId) : null);

  const fullnameRaw = toText(firstDefined(row, ["fullname", "display_name", "name", "fio", "ФИО"]));
  const fullname = fullnameRaw ?? (ycId ? `Клиент ${ycId}` : "Клиент без имени");
  const nameParts = splitName(fullname);

  const phone = toText(firstDefined(row, ["phone", "телефон", "Телефон", "mobile"]));
  const email = toText(firstDefined(row, ["email", "почта", "E-mail"]));
  const birthDate = toText(firstDefined(row, ["birth_date", "birthday", "дата рождения"]));
  const sex = toText(firstDefined(row, ["sex", "gender", "пол"]));
  const comment = toText(firstDefined(row, ["comment", "notes", "комментарий"]));

  return {
    org_uid: orgUid,
    yc_id: ycId,
    yclients_id: yclientsId,
    fullname,
    display_name: fullname,
    name: nameParts.name,
    surname: nameParts.surname,
    patronymic: nameParts.patronymic,
    phone,
    email,
    birth_date: birthDate,
    sex,
    comment,
    discount: toNumber(firstDefined(row, ["discount", "скидка"]), 0),
    visits: toNumber(firstDefined(row, ["visits", "visit_count", "визиты"]), 0),
    spent: toNumber(firstDefined(row, ["spent", "revenue", "выручка"]), 0),
    paid: toNumber(firstDefined(row, ["paid", "оплачено"]), 0),
    balance: toNumber(firstDefined(row, ["balance", "баланс"]), 0),
    source: "google_sheets",
  };
}
