import { app_get } from '../../components/logic/app';
import { app_api_get } from '../../components/logic/apis';
async function get_promo_codes() {
    const promocodes = await app_get('promo_code/', {});
    return promocodes;
}

async function get_session_details(session_id){
    const sessionDetais = await app_get(`session/${session_id}/`)
    return sessionDetais
}

async function delete_booking_on_error({paymentData, shiftDetails, zohoReceiptID}){
    if(paymentData?.id){await app_api_get('square/', {
        "request_type": "post",
        "url": `/refunds`,
        "payload": {
            "payment_id": paymentData.id,

            "team_member_id": shiftDetails.square_team_member_id,
            "amount_money": {
                "currency": "EGP",
                "amount": paymentData.total_money.amount,
        } 
    }}
    )}

    if(zohoReceiptID){
    await app_api_get('zoho/', {
        "request_type": "delete",
        "url": `/salesreceipts/${zohoReceiptID}`,
        "payload":{},
    })}
}   
export { get_promo_codes, get_session_details, delete_booking_on_error };
