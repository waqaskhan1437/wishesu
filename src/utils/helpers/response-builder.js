/**
 * Response Builder (Backend)
 * Consistent JSON response formatting
 */

/**
 * Success response
 */
export function success(data = null, message = null) {
  const response = {
    success: true
  };

  if (data !== null) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  return response;
}

/**
 * Error response
 */
export function error(message, code = null, details = null) {
  const response = {
    success: false,
    error: message
  };

  if (code) {
    response.code = code;
  }

  if (details) {
    response.details = details;
  }

  return response;
}

/**
 * Validation error response
 */
export function validationError(errors) {
  return {
    success: false,
    error: 'Validation failed',
    errors
  };
}

/**
 * Not found response
 */
export function notFound(resource = 'Resource') {
  return {
    success: false,
    error: `${resource} not found`
  };
}

/**
 * Unauthorized response
 */
export function unauthorized(message = 'Unauthorized') {
  return {
    success: false,
    error: message
  };
}

/**
 * Paginated response
 */
export function paginated(data, page, total, limit) {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
}

export default {
  success,
  error,
  validationError,
  notFound,
  unauthorized,
  paginated
};
