/**
 * Order Helper Functions
 */

export const uid = () => `OD-${Date.now().toString(36).slice(-6)}`;

export const parseJson = (value) => {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

export const decorate = (row) => ({
  ...row,
  addons: parseJson(row.addons_json)
});

export const extractR2Key = (value) => {
  if (typeof value !== 'string' || !value) return null;
  if (value.startsWith('r2://')) return value.replace('r2://', '');
  try {
    const url = new URL(value, 'http://local');
    if (url.pathname === '/api/r2/file') {
      return url.searchParams.get('key');
    }
  } catch {
    // ignore
  }
  return null;
};
