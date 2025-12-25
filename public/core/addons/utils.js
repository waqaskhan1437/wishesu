export const slugify = (value, idx = 0) =>
  `${String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') || 'field'}-${idx}`;

export const toNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const toInt = (value, fallback = 0) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : fallback;
};
