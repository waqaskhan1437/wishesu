export const rules = {
  required: (val, msg = 'Required') => (String(val || '').trim() ? '' : msg),
  min: (len) => (val) => (String(val || '').trim().length >= len ? '' : `Min ${len} chars`),
  email: (val) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val || '').trim()) ? '' : 'Invalid email')
};

export function validate(fields, schema) {
  const errors = {};
  Object.keys(schema).forEach((key) => {
    const checks = [].concat(schema[key]);
    const value = fields[key];
    for (const check of checks) {
      const msg = check(value);
      if (msg) { errors[key] = msg; break; }
    }
  });
  return errors;
}
