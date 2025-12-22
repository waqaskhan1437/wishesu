/**
 * Validation Utilities
 * Client-side validation functions for forms and data
 */

/**
 * Validate required field
 */
export function required(value, fieldName = 'Field') {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (typeof value === 'string' && value.trim() === '') {
    return { valid: false, error: `${fieldName} is required` };
  }

  return { valid: true };
}

/**
 * Validate email format
 */
export function email(value, fieldName = 'Email') {
  if (!value) {
    return { valid: false, error: `${fieldName} is required` };
  }

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!regex.test(value)) {
    return { valid: false, error: `${fieldName} must be a valid email address` };
  }

  return { valid: true };
}

/**
 * Validate minimum length
 */
export function minLength(value, min, fieldName = 'Field') {
  if (!value) {
    return { valid: false, error: `${fieldName} is required` };
  }

  const str = value.toString();

  if (str.length < min) {
    return { valid: false, error: `${fieldName} must be at least ${min} characters` };
  }

  return { valid: true };
}

/**
 * Validate maximum length
 */
export function maxLength(value, max, fieldName = 'Field') {
  if (!value) {
    return { valid: true }; // Empty is OK for maxLength
  }

  const str = value.toString();

  if (str.length > max) {
    return { valid: false, error: `${fieldName} must not exceed ${max} characters` };
  }

  return { valid: true };
}

/**
 * Validate length range
 */
export function lengthRange(value, min, max, fieldName = 'Field') {
  const minResult = minLength(value, min, fieldName);
  if (!minResult.valid) return minResult;

  return maxLength(value, max, fieldName);
}

/**
 * Validate number
 */
export function number(value, fieldName = 'Field') {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: `${fieldName} is required` };
  }

  const num = Number(value);

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }

  return { valid: true };
}

/**
 * Validate minimum value
 */
export function min(value, minValue, fieldName = 'Field') {
  const numResult = number(value, fieldName);
  if (!numResult.valid) return numResult;

  const num = Number(value);

  if (num < minValue) {
    return { valid: false, error: `${fieldName} must be at least ${minValue}` };
  }

  return { valid: true };
}

/**
 * Validate maximum value
 */
export function max(value, maxValue, fieldName = 'Field') {
  const numResult = number(value, fieldName);
  if (!numResult.valid) return numResult;

  const num = Number(value);

  if (num > maxValue) {
    return { valid: false, error: `${fieldName} must not exceed ${maxValue}` };
  }

  return { valid: true };
}

/**
 * Validate value range
 */
export function range(value, minValue, maxValue, fieldName = 'Field') {
  const minResult = min(value, minValue, fieldName);
  if (!minResult.valid) return minResult;

  return max(value, maxValue, fieldName);
}

/**
 * Validate URL format
 */
export function url(value, fieldName = 'URL') {
  if (!value) {
    return { valid: false, error: `${fieldName} is required` };
  }

  try {
    new URL(value);
    return { valid: true };
  } catch {
    return { valid: false, error: `${fieldName} must be a valid URL` };
  }
}

/**
 * Validate pattern (regex)
 */
export function pattern(value, regex, fieldName = 'Field', message = null) {
  if (!value) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (!regex.test(value)) {
    return {
      valid: false,
      error: message || `${fieldName} format is invalid`
    };
  }

  return { valid: true };
}

/**
 * Validate phone number (basic)
 */
export function phone(value, fieldName = 'Phone') {
  if (!value) {
    return { valid: false, error: `${fieldName} is required` };
  }

  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length < 10 || cleaned.length > 15) {
    return { valid: false, error: `${fieldName} must be a valid phone number` };
  }

  return { valid: true };
}

/**
 * Validate date
 */
export function date(value, fieldName = 'Date') {
  if (!value) {
    return { valid: false, error: `${fieldName} is required` };
  }

  const d = new Date(value);

  if (isNaN(d.getTime())) {
    return { valid: false, error: `${fieldName} must be a valid date` };
  }

  return { valid: true };
}

/**
 * Validate future date
 */
export function futureDate(value, fieldName = 'Date') {
  const dateResult = date(value, fieldName);
  if (!dateResult.valid) return dateResult;

  const d = new Date(value);
  const now = new Date();

  if (d <= now) {
    return { valid: false, error: `${fieldName} must be in the future` };
  }

  return { valid: true };
}

/**
 * Validate past date
 */
export function pastDate(value, fieldName = 'Date') {
  const dateResult = date(value, fieldName);
  if (!dateResult.valid) return dateResult;

  const d = new Date(value);
  const now = new Date();

  if (d >= now) {
    return { valid: false, error: `${fieldName} must be in the past` };
  }

  return { valid: true };
}

/**
 * Validate file extension
 */
export function fileExtension(filename, allowedExtensions, fieldName = 'File') {
  if (!filename) {
    return { valid: false, error: `${fieldName} is required` };
  }

  const ext = filename.split('.').pop().toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `${fieldName} must be one of: ${allowedExtensions.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Validate file size
 */
export function fileSize(size, maxSize, fieldName = 'File') {
  if (size > maxSize) {
    const maxMB = (maxSize / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `${fieldName} size must not exceed ${maxMB} MB`
    };
  }

  return { valid: true };
}

/**
 * Validate credit card (basic Luhn algorithm)
 */
export function creditCard(value, fieldName = 'Credit card') {
  if (!value) {
    return { valid: false, error: `${fieldName} is required` };
  }

  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length < 13 || cleaned.length > 19) {
    return { valid: false, error: `${fieldName} number is invalid` };
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  if (sum % 10 !== 0) {
    return { valid: false, error: `${fieldName} number is invalid` };
  }

  return { valid: true };
}

/**
 * Validate array not empty
 */
export function arrayNotEmpty(value, fieldName = 'Field') {
  if (!Array.isArray(value) || value.length === 0) {
    return { valid: false, error: `${fieldName} must have at least one item` };
  }

  return { valid: true };
}

/**
 * Validate one of allowed values
 */
export function oneOf(value, allowedValues, fieldName = 'Field') {
  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      error: `${fieldName} must be one of: ${allowedValues.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Validate multiple rules
 */
export function validate(value, rules, fieldName = 'Field') {
  const errors = [];

  for (const rule of rules) {
    const result = rule(value, fieldName);
    if (!result.valid) {
      errors.push(result.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate form object with schema
 */
export function validateForm(formData, schema) {
  const errors = {};
  let isValid = true;

  Object.keys(schema).forEach(fieldName => {
    const rules = schema[fieldName];
    const value = formData[fieldName];

    for (const rule of rules) {
      const result = rule(value, fieldName);
      if (!result.valid) {
        errors[fieldName] = result.error;
        isValid = false;
        break; // Stop at first error for this field
      }
    }
  });

  return {
    valid: isValid,
    errors
  };
}

/**
 * Custom validator creator
 */
export function custom(validatorFn, errorMessage) {
  return (value, fieldName) => {
    const isValid = validatorFn(value);
    return {
      valid: isValid,
      error: isValid ? null : (errorMessage || `${fieldName} is invalid`)
    };
  };
}
