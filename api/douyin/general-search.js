'use strict';

const { flattenTikHubResponse } = require('../../lib/flatten');

const TIKHUB_ENDPOINT =
  'https://api.tikhub.io/api/v1/douyin/search/fetch_general_search_v2';
const UPSTREAM_TIMEOUT_MS = 20000;

function send(res, status, payload) {
  res.status(status).json(payload);
}

function getBearerToken(req) {
  const authHeader =
    req.headers.authorization || req.headers.Authorization || '';

  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  return process.env.TIKHUB_API_TOKEN || '';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    send(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  const token = getBearerToken(req);
  if (!token) {
    send(res, 500, {
      error:
        'Missing TikHub token. Provide Authorization: Bearer <token> or set TIKHUB_API_TOKEN.'
    });
    return;
  }

  const body =
    req.body && typeof req.body === 'object'
      ? req.body
      : {};

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
    send(res, 400, { error: 'keyword is required.' });
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
    send(res, 502, {
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
    send(res, 502, {
      error: 'TikHub upstream response was not valid JSON.',
      status: upstreamResponse.status
    });
    return;
  }

  if (!upstreamResponse.ok) {
    send(res, upstreamResponse.status, {
      error: 'TikHub upstream API returned an error.',
      upstream_status: upstreamResponse.status,
      upstream_response: upstreamJson
    });
    return;
  }

  send(res, 200, flattenTikHubResponse(upstreamJson));
};
