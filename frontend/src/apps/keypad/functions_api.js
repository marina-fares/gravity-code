import { app_api_get } from "../../components/logic/apis"

async function create_order({shiftDetails, amount}){
    const response = await app_api_get('square/', {
        "request_type": "post",
        "url": "/orders",
        "payload": {
            "order": {
                "location_id": shiftDetails.square_location_id,
                "line_items":   [
                                    {
                                        "item_type": "CUSTOM_AMOUNT",
                                        "quantity": "1",
                                        "base_price_money": {
                                        "amount": parseInt(amount)*100,    // e.g. $50.00
                                        "currency": "EGP"
                                        }
                                    }
                                ],
                "state": "OPEN",
                "customer_id": shiftDetails.customer_id
            }
        }
    });

    if(response.order){
        return response.order;
    }
    else if (response.errors){
        return {"error": `${response.errors[0].detail } , ${response.errors[0].field }`};
    }
    else{
        return {"error": `${response.error }`};
    }
}

async function create_payment_api({shiftDetails, orderDetails, paymentMethod}){
    const response = await app_api_get('square/', {
    "request_type": "post",
    "url": "/payments",
    "payload": { 
        "order_id": orderDetails.id,
        "note": `Booking owner: ${shiftDetails.user.username}`,
        "source_id" : (paymentMethod === "cash")?"CASH": "EXTERNAL", 
        "amount" : orderDetails.total_money.amount ,
        "amount_money": {
            "amount": orderDetails.total_money.amount,
            "currency": "EGP"
            },
        "autocomplete": true, 
        "team_member_id": shiftDetails.square_team_member_id,
        "customer_id": shiftDetails.customer_id,
        "location_id": shiftDetails.square_location_id
        }
    })
    
    if(!response.errors){
        return response.payment
    }
    else if (response.errors){
        return {"error": `${response.errors[0].detail } , ${response.errors[0].field }`};
    }
    else{
        return {"error": `${response.error }`};
    } 
    
}

async function pay_order_api({orderDetails, paymentData, setAlert, setAlertMessage}){
    const response = await app_api_get('square/', {
        "request_type": "post",
        "url": `/orders/${orderDetails.id}/pay`,
        "payload": {
            "payment_ids": [paymentData.id]
        } }
    )
        
    if(response.errors)
    {
        setAlert(true)
        setAlertMessage(`${response.errors[0].detail} , ${response.errors[0].field}`)
    }
    else{
        return response
    }
        
}










export { create_order, create_payment_api, pay_order_api }