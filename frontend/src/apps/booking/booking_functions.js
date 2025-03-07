import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { app_api_get } from '../../components/logic/apis';
import { get_localstorage, set_localstorage } from '../../components/logic/localstorage';
import { Grid, TextField, Button, Input, FormControl, RadioGroup, FormControlLabel, Radio, Checkbox, CircularProgress, paperClasses } from '@mui/material';
import Card from 'react-bootstrap/Card';
import { useNavigate } from 'react-router-dom';
import * as React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import { get_jwt } from '../../components/logic/users';
import { get_shift, set_shift_fun, get_sub_shift, set_sub_shift_fun } from '../start_shift/shifts_functions';
import {get_user_and_jwt} from '../../components/logic/users'
import ResponsiveDialog from './alert'
import Backdropfun from './loading'
import delete_hold from './delete_hold'
import useWaitForDOMRef from '@restart/ui/esm/useWaitForDOMRef';
import { app_get } from '../../components/logic/app';

let APP_BASE_URL = 'http://44.201.113.49:5000/api/'

// console.log(get_localstorage('shift'))

export default function BookingAPI(data) {


    let [payment_for_square_api, set_payment_for_square_api] = useState(
        {
            "amount_money": {
            "amount": 0,
            "currency": "EGP"
            },
            "source_id": ""
    }
    )
    let booking_session_object = JSON.parse(get_localstorage('booking_session_object'));
    

    let [bookbutton, set_bookbutton] = useState(false)
    let [booking_number, set_booking_number] = useState(false)
    let [enventory_updated, set_enventory_updated] = useState(false)
    let [three_sessions, set_three_sessions] = useState([])
    const [current_group, set_current_group] = useState();

useEffect(() => {
// get the three sessions API 
        let startTime = new Date()
        console.log(startTime)
        let endTime = new Date(startTime)
		endTime.setDate(startTime.getDate() + 31)
        console.log(endTime)
            app_api_get('bookeo/', {
                "request_type": "get",
                "url": "/availability/slots",
                "payload": { "startTime": startTime , "endTime" : endTime,productId: booking_session_object.productId},
              }).then(response => {
                console.log(data.current_eventid)
                console.log(typeof(response.data))
                console.log(response.data)
                for (let i=0  ; i< Object.keys(response.data).length ; i++ )
                {
                    console.log(response.data[i])
                    console.log(typeof(response.data[i]))
                    if(response.data[i].eventId == data.current_eventid)
                    {
                        for (let j = i+1 ; j< Object.keys(response.data).length ; j++)
                        {
                            console.log(response.data[j])
                            set_three_sessions(three_sessions => (
                                [
                                    ...three_sessions, response.data[j]
                                ]  
                                 ))         
                        }
                        console.log(three_sessions)
                        break
                    }
                    
                }
            })
            
    // get the user's group details
    let current_group_data = app_get('current_group/')
    current_group_data.then((x) =>{
        console.log("current_group")
        console.log(x)
        console.log(x.cash_threshold_amount)
        console.log(x.visa_threshold_amount)
        set_current_group(x)
    })
}, []);


useEffect(()=>{
    if(!data.bookingsuccess){
        console.log("options")
        console.log(data.options)
        data.set_arr_options_fun()
    }

},[data.options, data.numbers, data.category_of_session, data.promocode, data.promotrue])


useEffect(()=>{
    if(enventory_updated)
    {
        data.set_bookingsuccess(true)
    }
},[enventory_updated])

useEffect(()=>{
    console.log("booking success", data.bookingsuccess)
    if(!data.bookingsuccess && data.square_receipt_number && data.square_order_id)  {
        bookeo_api()
    }
},[data.square_receipt_number])

useEffect(() => {
if(!data.bookingsuccess){
    if(data.square_order_id){
        create_payment_api()
    }
}
}, [data.square_order_id])

useEffect(()=>{
    console.log("booking flag use effect1")
if(data.booking_bookeo){

    if(data.firstPaid_method === "cash")
    {
        pay_order_api()
    }
    else{
        update_inventory()
    }

}
},[data.booking_bookeo])

useEffect(()=>{
    if(data.create_order_flag)
    {
        Book()
    }
    
},[data.create_order_flag])

//phase 1 
// check the customer name and money 
function Book(){
    data.handleToggle()
    if(!data.customer.firstName || !data.customer.lastName)
    {
        let date = new Date()
        date.setMonth(date.getMonth() + 1 )
        data.set_customer({"firstName": date.getFullYear() + "/" + date.getMonth() + "/" + date.getDate(),
                        "lastName": date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()})
    }
    if(data.firstPaid === '' || data.firstPaid_method === ''){
        data.set_alert(true)
        data.set_message("Please enter a valid payment")
    }
    create_order_api()
}

// phase 2
// create an order in square
function create_order_api(){

    app_api_get('square/', {
    "request_type": "post",
    "url": "/orders",
    "payload": {
        "order": {
            "location_id": data.updated_shift.square_location_id,
            "line_items": data.options_square_ids,
            "state": "OPEN",
            "customer_id": data.updated_shift.customer_id,
            "discounts": (data.promocode && data.promocode.square_pre > 0)? [ { "name": data.promocode.name , "percentage": data.promocode.percentage } ]: []
        }
}}).then((response) => {
    if(response.order){
        data.set_square_order_id(response.order.id) 
        data.set_square_totalprice(response.order.total_money.amount)
        data.set_options_square_items(response.order.line_items)
    }
    else{
        data.set_alert(true)
        data.set_message(response.errors[0].detail)
    }
})
}

// Phase 3
// create payment at square
function create_payment_api(){
    data.set_booking_bookeo(false)
    app_api_get('square/', {
        "request_type": "post",
        "url": "/payments",
        "payload": {...payment_for_square_api, 
            "order_id": data.square_order_id,
            "note": `Customer Name : ${data.customer.firstName} ${data.customer.lastName} Booking owner: ${get_user_and_jwt().user.username}`,
            "source_id" : (data.firstPaid_method === "cash")?"CASH": "EXTERNAL", 
            "amount" : data.firstPaid*100 ,
            "amount_money": {
                "amount": data.firstPaid *100,
                "currency": "EGP"
                },
            "autocomplete": (data.firstPaid_method === "cash")?false: true, 
            "team_member_id": data.updated_shift.square_team_member_id,
            "customer_id": data.updated_shift.customer_id
            }
    }).then(response => {
    // if the api succed
    if(response.payment){
        data.set_payment_ids(response.payment.id)
        data.set_square_receipt_number( response.payment.receipt_number)
    }
    else{
        data.set_payment_ids()
        data.set_alert(true)
        data.set_message(response.errors[0].detail)
    }   
    })

}

// phase 5
// pay order in square
function pay_order_api(){
    console.log("pay order function")
    console.log(data.square_order_id)
app_api_get('square/', {
    "request_type": "post",
    "url": `/orders/${data.square_order_id}/pay`,
    "payload": {
        "payment_ids": [data.payment_ids]
    } }
).then(response => {
    
    if(response.order)
    {
        update_inventory()
    }
    else{
        data.set_payment_ids()
        data.set_alert(true)
        data.set_message(response.errors[0].detail)
    }
        })

}
  
// phase 4
// create booking in bookeo
function bookeo_api(){

    set_bookbutton(true)
    // add only one payment
    app_api_get('bookeo/', {
            "request_type": "post",
            "url": "/bookings",
            "payload": {
                "eventId": (data.create_order_flag && three_sessions )?three_sessions[0].eventId:data.event_id,
                "customer": data.customer,
                "participants": {
                    "numbers": data.numbers,
                },
                "productId": booking_session_object.productId,
                "options":data.arr_options,
                "promotionCodeInput": ((data.promocode)?(data.promocode.duration > 1)?"":data.promocode.code : ""),
                
                "source": data.square_receipt_number,
                "initialPayments": (data.totalprice === "0")?[]:[{
                    "reason": "Initial deposit1",
                    "comment": data.square_receipt_number,
                    "description": "Prepaid package MemberShip 1",
                    "amount": {
                    "amount": data.firstPaid.toString(),
                    "currency": "EGP"
                    },
                    "paymentMethod": data.firstPaid_method}],     
                "externalRef": (data.note)?((data.note.length > 64)? data.note.slice('',54): data.note):'',
                "creationAgent": get_user_and_jwt().user.username,
                "sourceIp": data.square_order_id + '+' + get_user_and_jwt().user.username
            }
        }).then(response => {
                if(response.httpStatus){
                data.set_alert(true)
                data.set_message(response.message)
                }
                else{
                    if(data.promocode )
                    {
                        if(data.promocode.duration <= 1)
                        {
                            data.set_booking_bookeo(true)
                            console.log("the booking is created ")
                        }
                    }
                    else{
                        data.set_booking_bookeo(true)
                        console.log("the booking is created ")
                    }
                }
        })
if(data.promocode){
    for(let j=1; j < (data.promocode.duration ); j++ )
    {
if(three_sessions === undefined){
}
else{
        if(three_sessions[j-1]){
        app_api_get('bookeo/', {
            "request_type": "post",
            "url": "/bookings",
            "payload": {
                // add the event ID of the next session
                "eventId": three_sessions[j-1].eventId, 
                "customer": data.customer,
                "participants": {
                    "numbers": data.numbers,
                },
                "productId": booking_session_object.productId,
                // promocode 100% off
                "promotionCodeInput": data.promocode.code,
                "promotionName": "GC 10%",
                "externalRef": (data.note)?((data.note.length > 64)? data.note.slice('',54): data.note):'',
                
                "source": data.square_receipt_number ,
                "sourceIp": data.square_order_id + '+' + get_user_and_jwt().user.username,
            }
        }).then(response => {
            console.log("bookeo res", response)
        if(j === data.promocode.duration - 1 )
        {
            data.set_booking_bookeo(true)
        }
    })
    }
    }
    }
        
    }
}


// phase 6
// update inventory "update the shift and sub_shift data"
async function update_inventory(){
    console.log("111111111111111111111111111111111111")
    console.log("update inventory updated")
    console.log(data.options_square_items)
    console.log("sub shift data")
    console.log(data.sub_shift)
    for(var item in data.options_square_items) {
        data.updated_shift.inventory[data.options_square_items[item].name].sold += parseInt(data.options_square_items[item].quantity)
    }

    if(data.firstPaid_method === 'cash')
        {
            var old_cash = parseInt(data.updated_shift.shift_money_cash)
            var old_cash_sub_shift = parseInt(data.sub_shift.shift_money_cash)
            data.updated_shift.shift_money_cash = parseInt(old_cash) + parseInt(data.firstPaid)
            data.sub_shift.shift_money_cash = parseInt(old_cash_sub_shift) + parseInt(data.firstPaid)
        }

        else {
            var old_visa = data.updated_shift.shift_money_visa 
            var old_visa_sub_shift = parseInt(data.sub_shift.shift_money_visa)
            data.updated_shift.shift_money_visa = parseInt(old_visa) + parseInt(data.firstPaid)
            data.sub_shift.shift_money_visa = parseInt(old_visa_sub_shift) + parseInt(data.firstPaid)
        }

        let old_note = data.updated_shift.note
        let new_note = {[data.square_receipt_number]: data.note}
        if(data.note)
        {
            data.updated_shift.note = {...old_note, ...new_note}
            data.sub_shift.note = {...old_note, ...new_note}
        }
        else{
            data.updated_shift.note = old_note
            data.sub_shift.note = old_note

        }
    await set_shift_fun(data.updated_shift)
    await set_sub_shift_fun(data.sub_shift)

    // check if the user reaches the amount of thresholds

    if(data.sub_shift.shift_money_cash >= current_group.cash_threshold_amount || data.sub_shift.shift_money_visa >= current_group.visa_threshold_amount)
    {
        data.set_alert_threshold_amount(true)
    }
    
    set_enventory_updated(true)
    delete_hold()
    set_localstorage('three_sessions', JSON.stringify())
    }



return(
    <Button onClick={Book} variant="outlined" disable={bookbutton.toString()} className="w-50">Book</Button>
                        
)

}

