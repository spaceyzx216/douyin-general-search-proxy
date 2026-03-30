'use strict';

import { flattenTikHubResponse } from '../lib/flatten.js';

const TIKHUB_ENDPOINT =
  'https://api.tikhub.io/api/v1/douyin/search/fetch_general_search_v2';
const UPSTREAM_TIMEOUT_MS = 8000;

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers
  });
}

function getBearerToken(request, env) {
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  return env.TIKHUB_API_TOKEN || '';
}

async function handleHealth() {
  return json({ ok: true });
}

async function handleSearch(request, env) {
  const token = getBearerToken(request, env);
  if (!token) {
    return json(
      {
        error:
          'Missing TikHub token. Provide Authorization: Bearer <token> or set TIKHUB_API_TOKEN.'
      },
      { status: 500 }
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const payload = {
    keyword: body.keyword || '',
    cursor: typeof body.cursor === 'number' ? body.cursor : 0,
    sort_type: body.sort_type || '0',
    publish_time: body.publish_time || '0',
    filter_duration: body.filter_duration || '0',
    content_type: body.content_type || '0',
    search_id: body.search_id || '',
    backtrace: body.backtrace || ''
  };

  if (!payload.keyword) {
    return json({ error: 'keyword is required.' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(TIKHUB_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeout);
    return json(
      {
        error:
          error && error.name === 'AbortError'
            ? 'TikHub upstream API timed out.'
            : 'Failed to reach TikHub upstream API.',
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 502 }
    );
  }
  clearTimeout(timeout);

  let upstreamJson;
  try {
    upstreamJson = await upstreamResponse.json();
  } catch {
    return json(
      {
        error: 'TikHub upstream response was not valid JSON.',
        status: upstreamResponse.status
      },
      { status: 502 }
    );
  }

  if (!upstreamResponse.ok) {
    return json(
      {
        error: 'TikHub upstream API returned an error.',
        upstream_status: upstreamResponse.status,
        upstream_response: upstreamJson
      },
      { status: upstreamResponse.status }
    );
  }

  return json(flattenTikHubResponse(upstreamJson));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/api/health') {
      return handleHealth();
    }

    if (request.method === 'POST' && url.pathname === '/api/douyin/general-search') {
      return handleSearch(request, env);
    }

    return json({ error: 'Not found.' }, { status: 404 });
  }
};
