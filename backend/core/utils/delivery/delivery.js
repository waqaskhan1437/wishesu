const toInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
};

export function getDeliveryText(instant, deliveryDays) {
  if (instant === 1 || instant === true || instant === '1') {
    return 'Instant Delivery In 60 Minutes';
  }
  const days = toInt(deliveryDays, 2) || 2;
  if (days === 1) return '24 Hours Express Delivery';
  if (days === 2) return '2 Days Delivery';
  if (days === 3) return '3 Days Delivery';
  return `${days} Days Delivery`;
}

export function normalizeDeliveryDays(instant, deliveryDays) {
  if (instant === 1 || instant === true || instant === '1') {
    return { instant: 1, days: 0 };
  }
  const days = toInt(deliveryDays, 2) || 2;
  return { instant: 0, days };
}

export function calcDueAt(nowMs, instant, deliveryDays) {
  const { instant: isInstant, days } = normalizeDeliveryDays(instant, deliveryDays);
  const offsetMs = isInstant ? 60 * 60 * 1000 : days * 24 * 60 * 60 * 1000;
  return new Date(nowMs + offsetMs).toISOString();
}
