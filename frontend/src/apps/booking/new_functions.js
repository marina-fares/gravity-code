import { app_api_get } from "../../components/logic/apis"
import { set_shift, set_sub_shift } from "../../components/logic/shifts_functions_apis";
import { app_post } from "../../components/logic/app";

async function get_total_price({shiftDetails, promocode, options_square_ids}){
    const response = await app_api_get('square/', {
        "request_type": "post",
        "url": "/orders",
        "payload": {
            "order": {
                "location_id": shiftDetails.square_location_id,
                "line_items": options_square_ids,
                "state": "OPEN",
                "customer_id": shiftDetails.customer_id,
                "discounts": (promocode && promocode.square_pre > 0) 
                    ? [ { "name": promocode.name , "percentage": promocode.percentage } ] 
                    : []
            }
        }
    });

    if(response.order){
        return response.order;
    }
    else{
        return {"error": `${response.errors[0].detail} , ${response.errors[0].field}`};
    }
}

async function create_payment_api({shiftDetails, orderDetails, paymentMethod, set_alert, set_message}){
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
        "autocomplete": (paymentMethod === "cash")?false : true, 
        "team_member_id": shiftDetails.square_team_member_id,
        "customer_id": shiftDetails.customer_id,
        "location_id": shiftDetails.square_location_id
        }
    })
    
    if(!response.errors){
        return response.payment
    }
    else{
        set_alert(true)
        set_message(`${response.errors[0].detail} , ${response.errors[0].field}`)
    }   
    
}

async function pay_order_api({orderDetails, paymentData, set_alert, set_message}){
    const response = await app_api_get('square/', {
        "request_type": "post",
        "url": `/orders/${orderDetails.id}/pay`,
        "payload": {
            "payment_ids": [paymentData.id]
        } }
    )
        
    if(response.errors)
    {
        set_alert(true)
        set_message(`${response.errors[0].detail} , ${response.errors[0].field}`)
    }
        
}

async function create_sales_receipt({ shiftDetails, orderDetails, paymentData, options_zoho_items, set_alert, set_message}){
    const today = new Date(orderDetails.created_at);
    let response = await app_api_get('zoho/', {
        "request_type": "post",
        "url": "/salesreceipts",
        "payload": {
                "is_generic_customer": true,
                "customer_name": "Walk-in Customer",
                "date": today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0'),
                "line_items": options_zoho_items,
                "payment_mode": (paymentData.source_type === 'CASH')? 'cash' : 'creditcard',
                "custom_fields": [{
                    "label": "Product",
                    "value": "Park"
                },
                {
                    "label": "Gravity Branch",
                    "value": shiftDetails.user.group_name
                },
                {
                "label": "Staff Name",
                "value": shiftDetails.user.username
                },
                {
                "label": "Date and Time",
                "value": today.getFullYear() + "-" + 
                String(today.getMonth() + 1).padStart(2, '0') + "-" + 
                String(today.getDate()).padStart(2, '0') + " " + 
                String(today.getHours()).padStart(2, '0') + ":" + 
                String(today.getMinutes()).padStart(2, '0') + ":" + 
                String(today.getSeconds()).padStart(2, '0'),

                }
                ]
                }
        
    })
    if (response.code == 0)
    {
        return response.sales_receipt_details
    }
    else{
        set_alert(true)
        set_message(response.message)
    }

}

async function update_inventory({ shiftDetails, subShiftDetails, paymentData, options_square_items, note}){

    for(var item in options_square_items) {
        shiftDetails.inventory[options_square_items[item].name].sold += parseInt(options_square_items[item].quantity)
    }

    if(paymentData.source_type === 'CASH')
        {
            var old_cash = parseInt(shiftDetails.shift_money_cash)
            var old_cash_sub_shift = parseInt(subShiftDetails.shift_money_cash)
            shiftDetails.shift_money_cash = parseInt(old_cash) + (paymentData.total_money.amount / 100)
            subShiftDetails.shift_money_cash = parseInt(old_cash_sub_shift) + (paymentData.total_money.amount / 100)
        }

        else {
            var old_visa = shiftDetails.shift_money_visa 
            var old_visa_sub_shift = parseInt(subShiftDetails.shift_money_visa)
            shiftDetails.shift_money_visa = parseInt(old_visa) + (paymentData.total_money.amount / 100)
            subShiftDetails.shift_money_visa = parseInt(old_visa_sub_shift) + (paymentData.total_money.amount / 100)
        }

        let old_note = shiftDetails.note
        let new_note = {[paymentData.receipt_number]: note}
        if(note)
        {
            shiftDetails.note = {...old_note, ...new_note}
            subShiftDetails.note = {...old_note, ...new_note}
        }
        else{
            shiftDetails.note = old_note
            subShiftDetails.note = old_note

        }
    await set_shift(shiftDetails)
    await set_sub_shift(subShiftDetails)
    return true
    // check if the user reaches the amount of thresholds

    // if(shiftDetails.shift_money_cash >= current_group.cash_threshold_amount || data.sub_shift.shift_money_visa >= current_group.visa_threshold_amount)
    // {
    //     data.setAlert_threshold_amount(true)
    // }
    
    // set_enventory_updated(true)
    // delete_hold()
    // set_localstorage('three_sessions', JSON.stringify())
    }

async function add_new_booking({})
{
    const result = await app_post('/bookings/', {
        "session": session_id,
        "booking_customer": customer_id,
        "options": [],
        "payment": {},
        "number_of_players": 0,
        "type_of_players": "",
        "creation_agent": "",
        "created_at": datetime,
        "square_receipt_number": "",
        "square_order_id": "",
        "zoho_sales_receipt_id": "",
        "zoho_sales_receipt_num": "",
        "note": "",
        "status": "",
    })
}

export { get_total_price, create_payment_api, pay_order_api, create_sales_receipt, update_inventory }