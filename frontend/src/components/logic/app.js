import { get_jwt } from './users'

let APP_BASE_URL = 'https://44.201.165.150.nip.io/api/'


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

function app_get(url, params){
    let headers = {
        'Content-Type': 'application/json'
    }
    let token = get_jwt()
    if(token){
        headers['Authorization'] = `Bearer ${token}`
    }
    return fetch(APP_BASE_URL + url, {
        'method': 'get',
        headers,
        params: params
    })
    .then(response => response.json())
}

export { app_post, app_get }