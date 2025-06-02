import { get_jwt } from './users'

let APP_BASE_URL = 'https://fodev.gravitycode.me/api/'


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

function app_get(url, params = {}){
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
        'method': 'get',
        headers,
    })
    .then(response => response.json())
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