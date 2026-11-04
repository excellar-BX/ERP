// The shop's local time zone: decides what "today" means in reports and how dates display.
export const BUSINESS_TZ = process.env.BUSINESS_TZ ?? "Asia/Kolkata";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export const toPaise = (rupees: number) => Math.round(rupees * 100);

export const toRupees = (paise: number) => paise / 100;

export const formatINR = (paise: number) => inr.format(paise / 100);

export function formatQty(qty: number) {
  return Number.isInteger(qty) ? String(qty) : String(Number(qty.toFixed(3)));
}

export const invoiceNo = (id: number) => `INV-${String(id).padStart(5, "0")}`;

// Accepts a timestamp, or a plain "YYYY-MM-DD" calendar date.
export function formatDate(value: Date | string, withTime = true) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "UTC" });
  }
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    ...(withTime && { timeStyle: "short" }),
    timeZone: BUSINESS_TZ,
  });
}
