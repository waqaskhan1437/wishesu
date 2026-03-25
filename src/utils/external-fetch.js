/**
 * External Fetch - Consolidated external API calls
 * Consolidated from 15+ fetch patterns across codebase
 */

import { fetchWithTimeout, fetchWithRetry } from './fetch-timeout.js';

export async function fetchJson(url, options = {}) {
  const { timeout = 10000, headers = {}, ...rest } = options;
  
  try {
    const response = await fetchWithTimeout(url, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, timeout);

    if (!response.ok) {
      return { 
        ok: false, 
        status: response.status, 
        error: `HTTP ${response.status}` 
      };
    }

    const data = await response.json();
    return { ok: true, data, status: response.status };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function fetchText(url, options = {}) {
  const { timeout = 10000, headers = {}, ...rest } = options;
  
  try {
    const response = await fetchWithTimeout(url, {
      ...rest,
      headers
    }, timeout);

    if (!response.ok) {
      return { ok: false, status: response.status, error: `HTTP ${response.status}` };
    }

    const text = await response.text();
    return { ok: true, data: text, status: response.status };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function postJson(url, body, options = {}) {
  return fetchJson(url, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options
  });
}

export async function putJson(url, body, options = {}) {
  return fetchJson(url, {
    method: 'PUT',
    body: JSON.stringify(body),
    ...options
  });
}

export async function deleteRequest(url, options = {}) {
  return fetchJson(url, {
    method: 'DELETE',
    ...options
  });
}

export async function fetchWithAuth(url, token, options = {}) {
  return fetchJson(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
}

export async function cloudflareApi(endpoint, method = 'GET', body = null, apiToken) {
  const baseUrl = 'https://api.cloudflare.com/client/v4';
  const url = `${baseUrl}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return fetchJson(url, options);
}

export async function sendWebhook(url, payload, options = {}) {
  const { timeout = 5000, retries = 2 } = options;
  
  return fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    },
    { timeout, retries }
  );
}

export async function sendEmailViaMailchannels(to, from, subject, html, text) {
  const payload = {
    personalizations: [{
      to: [{ email: to }]
    }],
    from: { email: from },
    subject,
    content: [
      { type: 'text/html', value: html },
      ...(text ? [{ type: 'text/plain', value: text }] : [])
    ]
  };

  return postJson('https://api.mailchannels.net/tx/v1/send', payload);
}

export async function fetchGoogleSheets(scriptUrl, params = {}) {
  const url = `${scriptUrl}?${new URLSearchParams(params).toString()}`;
  return fetchText(url, { timeout: 30000 });
}
