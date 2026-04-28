import { get_jwt } from './users'

const APP_BASE_URL = process.env.REACT_APP_API_URL || 'https://fobook.gravitycode.me/api/';


function app_post(url, data){
    let headers = {
        'Content-Type': 'application/json'
    }
    let token = get_jwt()
    if(token){
        headers['Authorization'] = `Bearer ${token}`
    }
    return fetch(APP_BASE_URL + url, {
        'method': 'POST',
        headers,
        body: JSON.stringify(data)
    })
    .then(response => response.json())
}

async function app_get(url, params = {}) {
    let headers = {
        'Content-Type': 'application/json'
    };

    let token = get_jwt();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const queryString = new URLSearchParams(params).toString();
    const fullUrl = APP_BASE_URL + url + (queryString ? `?${queryString}` : '');

    try {
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers,
        });

        // ✅ Check status FIRST
        if (!response.ok) {
            const errorText = await response.text(); // sometimes not JSON
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // ✅ Only parse JSON if success
        const data = await response.json();

        // optional: return full response info
        return {
            status: response.status,
            data
        };

    } catch (error) {
        console.error('GET request failed:', error);
        return {
            status: 'error',
            data: null,
            error: error.message
        };
    }
}

function app_delete(url, params = {}){
    let headers = {
        'Content-Type': 'application/json'
    }
    let token = get_jwt()
    if(token){
        headers['Authorization'] = `Bearer ${token}`
    }

    const queryString = new URLSearchParams(params).toString();
    const fullUrl = APP_BASE_URL + url + (queryString ? `?${queryString}` : '');

    return fetch(fullUrl, {
        'method': 'delete',
        headers,
    })
    .then(response => response.json())
}

function app_put(url, params = {}, bodyData = {}) {
    let headers = {
        'Content-Type': 'application/json'
    };

    let token = get_jwt();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const queryString = new URLSearchParams(params).toString();
    const fullUrl = APP_BASE_URL + url + (queryString ? `?${queryString}` : '');

    return fetch(fullUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(bodyData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    });
}



export { app_post, app_get, app_delete, app_put }