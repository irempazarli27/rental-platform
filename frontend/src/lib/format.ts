export function formatPrice(value: string | number, currency = "TRY"): string {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export const CONDITION_LABELS: Record<string, string> = {
  new: "Sıfır",
  like_new: "Az Kullanılmış",
  good: "İyi Durumda",
  fair: "Kullanılabilir Durumda",
};

export const RISK_LABELS: Record<string, string> = {
  low: "Düşük Risk",
  medium: "Orta Risk",
  high: "Yüksek Risk",
};

export const DELIVERY_LABELS: Record<string, string> = {
  pickup: "Elden Teslim",
  delivery: "Kargo/Gönderi",
  both: "Elden Teslim veya Kargo",
};

export const RENTAL_STATUS_LABELS: Record<string, string> = {
  PENDING: "Onay Bekliyor",
  ACCEPTED: "Kabul Edildi",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal Edildi",
  READY_FOR_HANDOVER: "Teslime Hazır",
  ACTIVE: "Aktif",
  RETURN_PENDING: "İade Bekleniyor",
  RETURNED: "İade Edildi",
  COMPLETED: "Tamamlandı",
  DISPUTED: "Uyuşmazlık",
};

export const RENTAL_STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-blue-50 text-blue-700",
  REJECTED: "bg-red-50 text-red-700",
  CANCELLED: "bg-zinc-100 text-zinc-600",
  READY_FOR_HANDOVER: "bg-blue-50 text-blue-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  RETURN_PENDING: "bg-amber-50 text-amber-700",
  RETURNED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  DISPUTED: "bg-red-50 text-red-700",
};
