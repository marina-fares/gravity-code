import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { app_api_get } from '../../components/logic/apis';
import { get_localstorage, set_localstorage } from '../../components/logic/localstorage';
import { Grid, TextField, Button, Input, FormControl, RadioGroup, FormControlLabel, Radio, Checkbox, CircularProgress } from '@mui/material';
import Card from 'react-bootstrap/Card';
import { useNavigate } from 'react-router-dom';
import * as React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import { get_jwt } from '../../components/logic/users';
import { get_shift, set_shift_fun, get_sub_shift } from '../start_shift/shifts_functions';
import {get_user_and_jwt} from '../../components/logic/users'
import ResponsiveDialog from './alert'
import Backdropfun from './loading'
import delete_hold from './delete_hold'
import BookingAPI from './booking_functions';

let APP_BASE_URL = 'https://44.201.165.150.nip.io/api/'

export default function Booking() {

	let { event_id } = useParams()
    let booking_session_object = JSON.parse(get_localstorage('booking_session_object'));
    let [isloading, set_isloading] = useState(false);
    let [options, set_options] = useState({});
    let [customer, set_customer] = useState({});
    let [numbers, set_numbers] = useState([{
        "peopleCategoryId": booking_session_object.bookingLimits[1].peopleCategoryId,
        "number": "1"
    }]);
    let [note, set_note] = useState();
    let [list_promocode, set_list_promocode] = useState([]);
    let [promocode, set_promocode] = useState();
    let [firstPaid, set_firstPaid] = useState(0);
    let [firstPaid_method, set_firstPaid_method] = useState('cash');
    let [arr_options, set_arr_options] = useState([])
    let [alert, set_alert] = useState(false)
    let [message, set_message] = useState()
    let [square_totalprice, set_square_totalprice] = useState('')
    let [totalprice, set_totalprice] = useState()
    let [updated_shift, set_updated_shift] = useState();
    let [customer_data, set_customer_data] = useState([])
    let [category_ids, set_category_ids] = useState(JSON.parse(get_localstorage('category_ids')))
    let [category_items, set_category_items] = useState(JSON.parse(get_localstorage('category_items')))
    // the ids that will add in the square API
    let [options_square_ids, set_options_square_ids] = useState([])
    let [options_square_items, set_options_square_items] = useState([])
    let [bookingsuccess, set_bookingsuccess] = useState(false)
    let [square_receipt_number, set_square_receipt_number] = useState()
    let [booking_bookeo, set_booking_bookeo] = useState(false)
    let [promotrue, set_promotrue] = useState(false)
    let [open, setOpen] = useState(false)
    let [value, set_value] = useState(false)
    let [test, set_test] = useState(category_items[category_ids[booking_session_object["name"]]])
    // one hour, two hours
    let [category_of_session, set_category_of_session] = useState(category_items[category_ids[booking_session_object["name"]]]["1HR Park"])

    let [square_order_id, set_square_order_id] = useState()
    let [payment_ids, set_payment_ids] = useState([]);
    let [create_order_flag, set_create_order_flag] =useState(false)
    const [sub_shift, set_sub_shift] = useState();
    const [alert_threshold_amount, set_alert_threshold_amount] = useState(false);
const navigate = useNavigate()


// For the popup menu
function set_firstPaid_fun(e){
    const value = Math.max(0, Math.min(10000000000, Number(e.target.value)));
    set_firstPaid(value);
};

// for loading the page
const handleClose = () => {
    setOpen(false);
};

const handleToggle = () => {
    setOpen(!open); 
};     

// close the Alert tab
const handleCloseAlert = () => {

if(bookingsuccess){
    navigate("/")
}
else{
    set_alert(false)
    setOpen(false)
}
};


// delete anu holds on startup
useEffect(() => {

    var shift_data = get_shift()
    shift_data.then((x) => {
        set_updated_shift(x);
        
      });
    if(bookingsuccess)
    {
    delete_hold()
}
    console.log("shift in the booking page")
    console.log(updated_shift)
    

    let headers = {
        'Content-Type': 'application/json'
    }
    let token = get_jwt()
    if(token){
        headers['Authorization'] = `Bearer ${token}`
    }
    console.log("options_square_ids = ", options_square_ids)
    // app_api_get('promo_code/').then((res)=>console.log(res))
    fetch(APP_BASE_URL + 'promo_code/', {
    'method': 'GET',
    headers
    })
.then(response => response.json())
.then(res => {
    console.log("promocode")
    console.log(res)
    set_list_promocode(res)}
)


get_sub_shift().then((x) => {
    set_sub_shift(x)
})


}, []);



// set Dictionary of selected options key:value 
function set_options_fun(e){ 
set_options(options => ({
    ...options,
    [e.target.name]: ((e.target.value.length === 0 ))? 0: e.target.value
}));
}

// set Array of options for bookeo and square 
function set_arr_options_fun(){
set_arr_options([])
set_options_square_ids([])
// Bookeo Options 
for( let key in options)
{
    set_arr_options(arr_options => (
        [
            ...arr_options,{   
    ["name"]: key,
    ["value"]: options[key]
    }]));    
}

// square options
// if promocode
if(promocode)
{
// don't calculate the number of players in square
if(promocode.duration > 1)
{
    console.log("promooooooooooooooo")
    console.log(promocode.duration)
}
// calculare the number of players 
else{
    if(promotrue){
        set_options_square_ids([Object.assign({}, {
            ["quantity"]: (numbers[0]["number"]).toString(),
            ["catalog_object_id"]: category_of_session,
        } , {"applied_discounts":[0]})])
    }
    else{
        set_options_square_ids([{
            ["quantity"]: (numbers[0]["number"]).toString(),
            ["catalog_object_id"]: category_of_session,
        }    
        ])
    }
    
}
}

else{

set_options_square_ids([{
    ["quantity"]: (numbers[0]["number"]).toString(),
    ["catalog_object_id"]: category_of_session,
}])
    
}


for (const [key, value] of Object.entries(options)) {
    console.log("options = " , options)
    console.log(options_square_ids)
    console.log(key)
    console.log(value)
    console.log(category_items[category_ids[ booking_session_object["name"]+"+"]])
    console.log(category_items[category_ids["Add On"]])
    console.log(category_items)
    console.log(category_items[category_ids["Add On"]][key]?category_items[category_ids["Add On"]][key] : category_items[category_ids[ booking_session_object["name"]+"+"]][key])
    console.log(category_items[category_ids[ booking_session_object["name"]+"+"]][key])
    console.log([ booking_session_object["name"]+"+"])
    console.log(category_ids[ booking_session_object["name"]+"+"])
    if(value !== 0)
    {

        set_options_square_ids(options_square_ids => (
            [
                ...options_square_ids,{   
        ["quantity"]: (value).toString(),
        ["catalog_object_id"]: category_items[category_ids["Add On"]][key]?category_items[category_ids["Add On"]][key] : category_items[category_ids[ booking_session_object["name"]+"+"]][key]
        
    }]));

    }


}
}

// get the number of players for bookeo
function set_numbers_fun(e){
    const value = Math.max(1, Math.min(10000000000000000000, Number(e.target.value)));
    set_arr_options_fun()
    set_numbers([{
        "peopleCategoryId": booking_session_object.bookingLimits[1].peopleCategoryId,
        "number": value
    }])
}


function get_customer_data(e){
    console.log(customer_data)
    console.log(e)
    console.log(typeof(customer_data))
    console.log(customer_data.length)
    if(customer_data.length === 0 )
    {
        app_api_get('bookeo/', {
            "request_type": "get",
            "url": `/customers`,
            "payload":{
                "itemsPerPage": 100,
                "searchField": "firstName",
                "searchText": e ,
            },
            })
            .then(response1 => {
            set_customer_data(response1.data)
        })


    }

}
	
function set_customer_fun(e){
    console.log(e)


    if(e.split(" "))
    {
        let name=e.split(" ")
        let firstName = name[0]
        let lastName = name[1]
        set_customer({"firstName": firstName,
                        "lastName": lastName})
    }


}



    // send the Hold API for bookeo 
function hold_api(){
    if(!bookingsuccess)
    {
    handleToggle()
    
    delete_hold()
    if(numbers.number === "")
    {
    set_alert(true)
    set_message("Invalid number of players")
    }
    else{
        app_api_get('bookeo/', {
            "request_type": "post",
            "url": "/holds",
            "payload": {
                "eventId": event_id,

                "participants": {
                    "numbers": numbers,
                },
                "options":arr_options,
                "promotionCodeInput": ((!promocode)?"": ((promocode.duration > 1)?"":promocode.code)),
                
                "productId": booking_session_object.productId                
            }}
            ).then(response => {
               if(response.httpStatus){
                set_alert(true)
                set_message(response.message)
               }
               else{
                set_totalprice(response.totalPayable.amount)
                set_firstPaid(response.totalPayable.amount)
                set_localstorage('hold_ids', response.id);
                handleClose()
               }

            })
    }
}
}

// function validate(){

//  ();

// hold_api()
// }

useEffect(()=>{
    if(bookingsuccess){
        handleClose()
        set_alert(true)
    }
},[bookingsuccess])




const hi = window.innerHeight - 150


function setnote(event){
 set_note( event.target.value)
}


  
  
function set_category_of_session_fun(e){  
    set_category_of_session(e.target.value)
}

// base_price_money


return (
<div>
{updated_shift &&
    <Grid container spacing={2} className="mt-0 w-100 d-flex flex-row justify-content-center" >
            
        
           
            <Backdropfun open={open}/>
            <ResponsiveDialog 
            options_square_items = {options_square_items}
            square_receipt_number={square_receipt_number} updated_shift={updated_shift} square_totalprice={square_totalprice}
            firstPaid = {firstPaid} firstPaid_method ={firstPaid_method}
            bookingsuccess={bookingsuccess} alert={alert} message={message} handleCloseAlert={handleCloseAlert}  
            promocode={promocode} set_payment_ids={set_payment_ids} set_square_order_id={set_square_order_id} set_create_order_flag={set_create_order_flag}
            alert_threshold_amount = {alert_threshold_amount}
            />
            <Fragment >
                <h1 spacing={2} >{booking_session_object.name}</h1>
                <Card className=" w-100 d-flex flex-row justify-content-center border-0 mt-0">
                    {/* column: Name, number of players, payment, total price button, Back Button */}
                    <Card className="w-50 max-vw-25 d-flex flex-column m-2 mt-0 border-0">      
                        <Card className="w-auto  d-flex flex-row justify-content-center border-0 p-2">
                                <Autocomplete
                                    disablePortal
                                    freeSolo
                                    id="combo-box-demo"
                                    options={customer_data.map((customer)=>   customer.firstName +" " + customer.lastName )}
                                    className="form-control d-flex flex-column justify-content-start w-75 border-0 m-0 p-0"
                                    sx={{ width: 300 }}
                                    onInputChange={(event, newValue) => {
                                    // search customer on the first name
                                        set_customer_fun(newValue)
                                        get_customer_data(newValue)
                                        
                                    }}
                                    renderInput={(params) => <TextField {...params} label="Customer Name" 
                                    />}
                                />
                            


                            <Input className='form-control d-flex flex-column justify-content-end w-25' defaultValue={1} inputProps={{ min: 1 , max: booking_session_object.bookingLimits[0].max }} onChange={set_numbers_fun} type="number"  name="number of players" label ="number of players"  step="1" />   
                            <FormControlLabel 
                            control={<Checkbox checked={promotrue} onChange={((e)=>set_promotrue(!promotrue))} />}
                            />
                        </Card>

                        

 

                        <RadioGroup
                                row
                                aria-labelledby="demo-row-radio-buttons-group-label"
                                name="row-radio-buttons-group"
                                defaultValue="1HR Park"
                                value={category_of_session}
                                onChange={(e) => {

                                    set_category_of_session_fun(e)}
                                }
                                
                            >
                        { Object.entries(test).map(([key, val])=>(
                        //Row For Each option
                        
                        // <FormControlLabel checked={((key=="1HR Park")?true:false)} label={key} value={val}  control={<Radio />} className="w-20 m-0 p-0" />
                        <FormControlLabel key={key} label={key} value={val}  control={<Radio />} className="w-20 m-0 p-0" />
                        
                        ))} 
                        </RadioGroup>

                        <Autocomplete
                            disablePortal
                            freeSolo
                            id="Promo Code"
                            options={list_promocode.map((promo_code)=>  promo_code.code )}
                            className="border-0 w-100 p-2"
                            sx={{ width: 3 }}
                            onInputChange={(event, newValue) => {
                                let promo_code = list_promocode.find((promo_code)=> promo_code.code === newValue)
                                
                                
                                if(promo_code){
                                    console.log(promo_code)
                                    set_promocode(promo_code)
                                }
                                else{
                                    set_promocode()
                                }
                            }}
                            renderInput={(params) => <TextField {...params} label="Promo Code" />}
                            />

                        <FormControl className="p-2">
                            <TextField
                                required
                                id="First Paid"
                                label= "First Paid"
                                onChange= {set_firstPaid_fun}
                                className="from-control border-0 w-100 "
                                value={parseInt(firstPaid)}
                                defaultValue={parseInt(totalprice)}
                                
                            />
                            <RadioGroup
                                    row
                                    aria-labelledby="demo-row-radio-buttons-group-label"
                                    name="row-radio-buttons-group"
                                    onChange={(e) => set_firstPaid_method(e.target.value)}
                                    defaultValue="cash"
                                >
                                <FormControlLabel value="cash" control={<Radio />} label="Cash" className="w-50" />
                                <FormControlLabel value="creditCard" control={<Radio />} label="Credit" />
                            </RadioGroup>
                        </FormControl>



            
                        <Card className="w-auto  d-flex flex-row justify-content-center border-0 p-1" >
                            <Button onClick={hold_api} variant="outlined" className="w-50">Total Price</Button>
                            <BookingAPI set_bookingsuccess={set_bookingsuccess} bookingsuccess={bookingsuccess} options={options}
        set_options={set_options} numbers={numbers} category_of_session={category_of_session} promocode={promocode}
        updated_shift={updated_shift} square_receipt_number={square_receipt_number} set_square_receipt_number={set_square_receipt_number}
        promotrue={promotrue} set_arr_options_fun={set_arr_options_fun} firstPaid={firstPaid} firstPaid_method={firstPaid_method}
        options_square_ids={options_square_ids} set_square_totalprice={set_square_totalprice} set_options_square_items={set_options_square_items} set_alert={set_alert}
        set_message={set_message} handleClose={handleClose} customer={customer} totalprice={totalprice} options_square_items={options_square_items}
        event_id={event_id} arr_options={arr_options} note={note} category_items={category_items} category_ids={category_ids}
        handleToggle={handleToggle} set_customer={set_customer}  square_order_id={square_order_id}
        set_square_order_id={set_square_order_id} payment_ids={payment_ids} set_payment_ids={set_payment_ids} set_booking_bookeo={set_booking_bookeo}
        booking_bookeo={booking_bookeo} create_order_flag={create_order_flag} current_eventid = {event_id} sub_shift = {sub_shift} set_alert_threshold_amount = {set_alert_threshold_amount}
        alert_threshold_amount = {alert_threshold_amount}
        />
                        
                        </Card>
                    </Card>

                    {/* Options */}
                    <Card className="w-50 max-vw-25 d-flex flex-column m-1 mt-0 border-0">

                        { booking_session_object.numberOptions.map((item)=>(
                        //Row For Each option
                        <Card className="w-auto  d-flex flex-row justify-content-center border-0 p-2" key={item.name}>
                            {/* Labels */}
                            <h1 className="form-control d-flex flex-column justify-content-start w-50 mt-2 border-0" key={item.name}>
                            {item.name}
                            </h1>
                            {/* number for each option */}
                            {    item.maxValue === 1
                                    ? <Input className='form-control d-flex flex-column justify-content-start w-25 ' inputProps={{ min: item.minValue, max: item.maxValue }} onChange={(e) => {set_options_fun(e)}} type="checkbox"  name={item.name} label ={item.name} />
                                    : <Input default={0} className='form-control d-flex flex-column justify-content-start w-25 ' inputProps={{ min: 0, max: item.maxValue }} onChange={(e) => {set_options_fun(e)}} type="number"  name={item.name} label ={item.name}  step="1" />
                            }   
                        </Card>
                
                        ))} 
                        <TextField
                        id="outlined-multiline-flexible"
                        label="Notes"
                        multiline
                        maxRows={4}
                        // value={value}
                        className = "from-control border-0 w-100 p-2"
                        onChange={setnote}
                        />
<Card className="w-auto  d-flex flex-row justify-content-center border-0 p-2">

                    {isloading && (
                            <CircularProgress
                                size={68}
                            
                            />
                            )}
                        <h4>{totalprice}</h4>
                        </Card>


                    </Card>
                </Card>    
							
            </Fragment>
    </Grid>

}
        </div>)

}
