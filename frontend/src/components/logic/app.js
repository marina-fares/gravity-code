import { get_jwt } from './users'

const APP_BASE_URL = process.env.REACT_APP_API_URL;

// ─── Unified request layer ───────────────────────────────────────────────────
// Every request function (app_get / app_post / app_put / app_delete) resolves to
// ONE shape so callers can treat success and failure the same way everywhere:
//
//   success  → { status: <httpStatus>, data: <parsedBody> }
//   failure  → { status: <httpStatus | 0>, error: <message>, detail: <detail?> }
//
// A failure is any non-2xx HTTP response OR a network/parse error. These never
// throw — the caller always gets an object and checks `.status === 200` (or
// `.error`). `fetch()` does NOT reject on 4xx/5xx (only on network errors), so
// `response.ok` must be checked explicitly on every call.

function _auth_headers() {
    const headers = { 'Content-Type': 'application/json' };
    const token = get_jwt();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

function _build_url(url, params) {
    const queryString = new URLSearchParams(params || {}).toString();
    return APP_BASE_URL + url + (queryString ? `?${queryString}` : '');
}

// Parse the body defensively — an error (or 204) response may be empty or
// non-JSON (e.g. a 502 HTML page from a proxy), which would otherwise make
// response.json() throw.
async function _parse_body(response) {
    try {
        const text = await response.text();
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch {
            return text; // non-JSON body — hand back the raw text
        }
    } catch {
        return null;
    }
}

async function _normalize(response) {
    const payload = await _parse_body(response);

    if (!response.ok) {
        const detail = payload && typeof payload === 'object' ? payload.detail : undefined;
        const message =
            (payload && typeof payload === 'object' && (payload.error || payload.detail)) ||
            (typeof payload === 'string' && payload) ||
            `HTTP ${response.status}`;
        return { status: response.status, error: message, detail };
    }

    return { status: response.status, data: payload };
}

async function _request(method, url, { params, body } = {}) {
    try {
        const options = { method, headers: _auth_headers() };
        if (body !== undefined) {
            options.body = JSON.stringify(body);
        }
        const response = await fetch(_build_url(url, params), options);
        return await _normalize(response);
    } catch (error) {
        // Network failure, CORS, aborted request, etc. fetch() rejects here.
        console.error(`${method} ${url} failed:`, error);
        return { status: 0, error: error?.message || 'Network request failed.' };
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────
// Signatures are unchanged so existing call sites keep working; only the return
// shape is now uniform across all four.

function app_get(url, params = {}) {
    return _request('GET', url, { params });
}

function app_post(url, data) {
    return _request('POST', url, { body: data });
}

function app_put(url, params = {}, bodyData = {}) {
    return _request('PUT', url, { params, body: bodyData });
}

function app_delete(url, params = {}) {
    return _request('DELETE', url, { params });
}

export { app_post, app_get, app_delete, app_put }
