import { app_get } from '../../components/logic/app';

async function get_promo_codes() {
    const promocodes = await app_get('promo_code/', {});
    return promocodes;
}

async function get_session_details(session_id){
    const sessionDetais = await app_get(`session/${session_id}/`)
    return sessionDetais
}

async function get_all_customers(){
    const customersData = await app_get('customers/')
    return customersData
}


export { get_promo_codes, get_session_details, get_all_customers };
