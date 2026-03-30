'use strict';

const http = require('http');
const { URL } = require('url');
const { flattenTikHubResponse } = require('./lib/flatten');

const PORT = Number(process.env.PORT || 8787);
const TIKHUB_API_TOKEN = process.env.TIKHUB_API_TOKEN || '';
const TIKHUB_ENDPOINT =
  'https://api.tikhub.io/api/v1/douyin/search/fetch_general_search_v2';
const UPSTREAM_TIMEOUT_MS = 20000;

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Request body must be valid JSON.'));
      }
    });

    req.on('error', reject);
  });
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  return TIKHUB_API_TOKEN;
}

async function handleSearch(req, res) {
  const token = getBearerToken(req);

  if (!token) {
    sendJson(res, 500, {
      error:
        'Missing TikHub token. Provide Authorization: Bearer <token> or set TIKHUB_API_TOKEN.'
    });
    return;
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
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
    sendJson(res, 400, { error: 'keyword is required.' });
    return;
  }

  let upstreamResponse;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    upstreamResponse = await fetch(TIKHUB_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeout);
    sendJson(res, 502, {
      error:
        error.name === 'AbortError'
          ? 'TikHub upstream API timed out.'
          : 'Failed to reach TikHub upstream API.',
      detail: error.message
    });
    return;
  }
  clearTimeout(timeout);

  let upstreamJson;
  try {
    upstreamJson = await upstreamResponse.json();
  } catch (error) {
    sendJson(res, 502, {
      error: 'TikHub upstream response was not valid JSON.',
      status: upstreamResponse.status
    });
    return;
  }

  if (!upstreamResponse.ok) {
    sendJson(res, upstreamResponse.status, {
      error: 'TikHub upstream API returned an error.',
      upstream_status: upstreamResponse.status,
      upstream_response: upstreamJson
    });
    return;
  }

  sendJson(res, 200, flattenTikHubResponse(upstreamJson));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/douyin/general-search') {
    await handleSearch(req, res);
    return;
  }

  sendJson(res, 404, { error: 'Not found.' });
});

server.listen(PORT, () => {
  console.log(`Douyin general search proxy listening on http://localhost:${PORT}`);
});
