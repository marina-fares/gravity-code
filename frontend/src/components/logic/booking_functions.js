import { app_api_get, app_api_put } from "./apis"
import { set_shift, set_sub_shift } from "./shifts_functions_apis";
import { app_post, app_delete, app_get, app_put } from "./app";
import { set_localstorage } from "./localstorage";

async function get_total_price({shiftDetails, promoCode, selectedSquareItems}){
    const response = await app_api_get('square/', {
        "request_type": "post",
        "url": "/orders",
        "payload": {
            "order": {
                "location_id": shiftDetails.square_location_id,
                "line_items": selectedSquareItems,
                "state": "OPEN",
                "customer_id": shiftDetails.customer_id,
                "discounts": (promoCode && promoCode.square_pre > 0) 
                    ? [ { "name": promoCode.name , "percentage": promoCode.percentage } ] 
                    : []
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
    let  data = { 
        "order_id": orderDetails.id,
        "note": `Booking owner: ${shiftDetails.user.username}`,
        "source_id" : (paymentMethod === "cash")?"CASH": "EXTERNAL", 
        "amount" : orderDetails.total_money.amount ,
        "amount_money": {
            "amount": orderDetails.total_money.amount,
            "currency": "EGP"
            },
         
        "team_member_id": shiftDetails.square_team_member_id,
        "customer_id": shiftDetails.customer_id,
        "location_id": shiftDetails.square_location_id
        }

        if (paymentMethod === 'cash') {
            data.cash_details = {
            buyer_supplied_money: {
                amount: orderDetails.total_money.amount,
                currency: "EGP"
            }
            };
        }else{
            data.autocomplete = true
        }

        const response = await app_api_get('square/', {
        "request_type": "post",
        "url": "/payments",
        "payload": data
        })
    
    return response  
    
}


async function create_sales_receipt({ shiftDetails, orderDetails, paymentData, selectedZohoItems}){
    const today = new Date(orderDetails.created_at);
    let response = await app_api_get('zoho/', {
        "request_type": "post",
        "url": "/salesreceipts",
        "payload": {
                "is_generic_customer": true,
                "customer_name": "Walk-in Customer",
                "date": today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0'),
                "line_items": selectedZohoItems,
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
    return response;

}

async function add_to_inventory({ shiftDetails, subShiftDetails, paymentData, options, note}){

    options.forEach(item => {
        console.log(item)
        if(shiftDetails.inventory[item.name]){
            shiftDetails.inventory[item.name].sold += parseInt(item.quantity)

        }
    })

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

    }

async function create_booking({sessionsDetails, bookingDetails, round})
{
    if (round > 0){
        delete bookingDetails.id
    }
    const response = await app_post(`bookings/${sessionsDetails[round].id}/`, bookingDetails)
    
    return response
}

async function create_hold_booking({bookingDetails, session_id, numberOfPlayers }){
    const data = {
        "number_of_players": numberOfPlayers,
        "created_at": new Date() ,
        "status": "hold",
    }
    if (bookingDetails?.id) {
    data.id = bookingDetails.id;
    }

    const result = await app_post(`bookings/${session_id}/`, data)
    return result
}

async function create_customer({customerName}){
    const data = {
    identifier: customerName 
    };
    const customerData = await app_post('customers/', data);
    return customerData

}

async function delete_hold_booking({bookingId}){
    
    if (bookingId && bookingId!== 'undefined')
    {
        await app_delete(`booking/${bookingId}/`)
        set_localstorage('bookingId', undefined)

    }
    
}

async function update_sales_receipt({orderDetails, salesReceiptID, selectedZohoItems, paymentMethod}){
    const today = new Date();
    const response = app_api_put('zoho/', {
        "request_type": "put",
        "url": `/salesreceipts/${salesReceiptID}`,
        "payload": {
            "date": today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0'),
            "line_items": selectedZohoItems,
            "payment_mode": (paymentMethod === 'cash')? 'cash' : 'creditcard'
}})
return response
}

async function delete_from_inventory({bookingDetails, shiftDetails, subShiftDetails, oldItems}){
    
    bookingDetails.options.forEach((item, index) => 
    {

        shiftDetails.inventory[item.name].refund += parseInt(item.quantity)
    })

    if(bookingDetails.payment.method === "cash")
    {
        shiftDetails.refund_cash += bookingDetails.payment.amount
        subShiftDetails.refund_cash += bookingDetails.payment.amount
    }
    else{
        shiftDetails.refund_visa += bookingDetails.payment.amount
        subShiftDetails.refund_visa += bookingDetails.payment.amount
    }

    
    await set_shift(shiftDetails)
    await set_sub_shift(subShiftDetails)

}

async function update_inventory({bookingDetails, shiftDetails, subShiftDetails, oldItems}){
    
    bookingDetails.options.forEach((item, index) => 
    {
        console.log(item)
        shiftDetails.inventory[item.name].sold += parseInt(item.quantity)
        if(bookingDetails.payment.method === "cash")
        {
        shiftDetails.shift_money_cash += item.base_price_money.amount
        subShiftDetails.shift_money_cash += item.base_price_money.amount
        }
        else{
        shiftDetails.shift_money_visa += item.base_price_money.amount
        subShiftDetails.shift_money_visa += item.base_price_money.amount
        }
    })

    oldItems.forEach((item, index) => 
    {

        shiftDetails.inventory[item.name].sold -= parseInt(item.quantity)
        if(bookingDetails.payment.method === "cash")
        {
        shiftDetails.shift_money_cash -= item.base_price_money.amount
        subShiftDetails.shift_money_cash -= item.base_price_money.amount
        }
        else{
        shiftDetails.shift_money_visa -= item.base_price_money.amount
        subShiftDetails.shift_money_visa -= item.base_price_money.amount
        }
    })



    
    await set_shift(shiftDetails)
    await set_sub_shift(subShiftDetails)

}

async function get_product() {
    const productsDetails = await app_get('products/', {});
    return productsDetails;
}

async function get_session_details(session_id){
    const sessionDetais = await app_get(`session/${session_id}/`)
    return sessionDetais
}

async function get_available_sessions(payload) {
    const  availableSessions = await app_post('sessions/', {payload});
    return availableSessions;
}

async function get_old_bookings_for_spesific_session(session_id)
{
    const oldBookingsData = await app_get(`bookings/${session_id}/`, {});
    return oldBookingsData
}

async function get_booking_details(booking_id)
{
    const oldBookingsData = await app_get(`booking/${booking_id}/`, {});
    return oldBookingsData
}


async function delete_booking_from_zoho({zohoReceiptID}){
    await app_api_get('zoho/', {
        "request_type": "delete",
        "url": `/salesreceipts/${zohoReceiptID}`,
        "payload":{},
    })
}

async function update_booking_details({bookingDetails, new_session_id})
{
    await app_put(`bookings/${new_session_id}/`, {}, bookingDetails)
    return true
}

async function delete_booking_from_square({bookingDetails, shiftDetails}){
    const response = await app_api_get('square/', {
        "request_type": "post",
        "url": `/refunds`,
        "payload": {
            "payment_id": bookingDetails.square_payment_id,

            "team_member_id": shiftDetails.square_team_member_id,
            "amount_money": {
                "currency": "EGP",
                "amount": bookingDetails.payment.amount * 100,
        } 
    }}
    )
    if(response.refund)
    {
        return true   
    }
    else if(response.error){
        return {"error": `${response.error}`}
    }
    else{
        return {"error": `${response.errors[0].detail}`}        
    }   
}   

export { 
    get_product,
    get_available_sessions,
    get_session_details,
    get_old_bookings_for_spesific_session,
    delete_booking_from_square,
    update_booking_details,
    delete_booking_from_zoho,
    get_booking_details,
    get_total_price, 
    create_payment_api, 
    create_sales_receipt, 
    update_sales_receipt, 
    update_inventory,
    add_to_inventory, delete_from_inventory, create_hold_booking, create_customer, create_booking, delete_hold_booking }