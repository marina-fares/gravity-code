import { app_api_post, app_api_put } from './apis'
import { delete_localstorage, get_localstorage, set_localstorage } from './localstorage'

let JWT_KEY = 'JWT_KEY'
let USER_KEY = 'USER_KEY'



function get_jwt(){
     return get_localstorage(JWT_KEY)
}

function set_jwt(jwt){
    return set_localstorage(JWT_KEY, jwt)
}

function remove_jwt(){
    return delete_localstorage(JWT_KEY)
}

function set_user(user){
    set_localstorage(USER_KEY, JSON.stringify(user))

}

function get_user(jwt){
    return JSON.parse(get_localstorage(USER_KEY))
}

function remove_user(){
    delete_localstorage(USER_KEY)
}


function remove_user_and_jwt(){
    remove_jwt()
    remove_user()
}

function get_user_and_jwt(){
    let jwt = get_jwt()
    let user = get_user(jwt)
    return {user, jwt} 
}

function login(username, password) {
    return app_api_post('token/', {username, password})
    .then(data => {
        if (data.access) {
            set_jwt(data.access);
            return get_and_store_user(); // return this Promise
        } else {
            throw new Error('Invalid login credentials');
        }
    });
}


function get_and_store_user(){
    let data =  app_api_put('current_user/', {}).then(data => {

        set_user(data)
    })
}

export {get_user_and_jwt, login, get_jwt, get_and_store_user, remove_user_and_jwt}