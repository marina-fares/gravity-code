function set_localstorage(key, data){
    localStorage.setItem(key, data)
    const event = new StorageEvent('storage', {
        key,
        newValue: data
    })
    window.dispatchEvent(event)
}

function get_localstorage(key){
    return localStorage.getItem(key)
}

function delete_localstorage(key){
    localStorage.removeItem(key)
    const event = new StorageEvent('storage', {
        key,
    })
    window.dispatchEvent(event)
}

export { set_localstorage, get_localstorage, delete_localstorage }