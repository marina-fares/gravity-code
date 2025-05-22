// apis.js
import { get_jwt } from './users'
import { safeJson } from './utils' // Importing the safeJson function

let APP_BASE_URL = 'http://localhost:5000/api/'

function app_api_post(url, data) {
    let headers = {
        'Content-Type': 'application/json'
    }
    let token = get_jwt()
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }
    return fetch(APP_BASE_URL + url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
    })
    .then(safeJson) // Using safeJson to handle the response
}

function app_api_get(url, params) {
    let headers = {
        'Content-Type': 'application/json'
    }
    let token = get_jwt()
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }
    return fetch(APP_BASE_URL + url, {
        method: 'POST',
        headers,
        body: JSON.stringify(params)
    })
    .then(safeJson) // Using safeJson to handle the response
}

function app_api_put(url, data) {
    let headers = {
        'Content-Type': 'application/json'
    }
    let token = get_jwt()
    if (token !== undefined) {
        headers['Authorization'] = `Bearer ${token}`
    }
    return fetch(APP_BASE_URL + url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
    })
    .then(safeJson) // Using safeJson to handle the response
}

export { app_api_post, app_api_get, app_api_put }
