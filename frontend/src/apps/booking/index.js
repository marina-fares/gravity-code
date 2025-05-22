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
// import { get_shift, set_shift_fun, get_subShiftDetails } from '../start_shift/shifts_functions';
import { get_shift, get_sub_shift } from '../../components/logic/shifts_functions_apis'
import {get_user_and_jwt} from '../../components/logic/users'
import ResponsiveDialog from './alert'
import Backdropfun from './loading'
import delete_hold from './delete_hold'
import BookingAPI from './booking_functions';
import LoadingFun from '../../components/ui/loading';
import AlertFun from '../../components/ui/alert';
import { get_promo_codes, get_session_details, get_all_customers } from './functions_apis';
import { get_total_price, create_payment_api, pay_order_api, create_sales_receipt, update_inventory } from './new_functions';

let APP_BASE_URL = 'https://fo.gravitycode.me/api/'

export default function Booking() {

	let { session_id } = useParams()
    let [sessionDetails, setSessionDetails ] = useState('')
    let booking_session_object = JSON.parse(get_localstorage('booking_session_object'));
    let [isloading, set_isloading] = useState(false);
    let [options, set_options] = useState({});
    let [customer, set_customer] = useState({});
    let [numbers, set_numbers] = useState();
    let [note, set_note] = useState();
    let [allPromoCodes, setAllPromoCodes] = useState([]);
    let [promocode, set_promocode] = useState();
    let [paid, setPaid] = useState(0);
    let [paymentMethod, setPaymentMethod] = useState('cash');
    let [arr_options, set_arr_options] = useState([])
    let [alert, set_alert] = useState(false)
    let [message, set_message] = useState()
    let [square_totalPrice, set_square_totalPrice] = useState('')
    let [totalPrice, setTotalPrice] = useState()
    let [shiftDetails, setShiftDetails] = useState();
    let [customer_data, set_customer_data] = useState([])
    let [squareCategories, setSquareCategories] = useState(JSON.parse(get_localstorage('category_ids')))
    let [squareCategoryItems, setSquareCategoryItems] = useState(JSON.parse(get_localstorage('category_items')))
    let [ allSquareItems ] = useState(JSON.parse(get_localstorage('squareItems')))
    let [zoho_items, set_zoho_items] = useState(JSON.parse(get_localstorage('zoho_items')))
    // the ids that will add in the square API
    let [options_square_ids, set_options_square_ids] = useState([])
    let [options_square_items, set_options_square_items] = useState([])
    let [options_zoho_items, set_options_zoho_items] = useState([])
    let [bookingsuccess, set_bookingsuccess] = useState(false)
    let [square_receipt_number, set_square_receipt_number] = useState()
    let [booking_bookeo, set_booking_bookeo] = useState(false)
    let [promotrue, set_promotrue] = useState(false)
    let [open, setOpen] = useState(false)
    let [value, set_value] = useState(false)
    let [test, set_test] = useState(squareCategoryItems[squareCategories[booking_session_object["name"]]])
    // for the number of players item for square, this is the name of the session type
    let [selectedCategory, setSelectedCategory] = useState()
    let [numberOfPlayers, setNumberOfPlayers] = useState(1)

    let [square_order_id, set_square_order_id] = useState()
    let [payment_ids, set_payment_ids] = useState([]);
    let [create_order_flag, set_create_order_flag] =useState(false)
    const [subShiftDetails, setSubShiftDetails] = useState();
    const [alert_threshold_amount, set_alert_threshold_amount] = useState(false);
    let [ allCustomers, setAllCustomers ] = useState()
    let [ customersDetails, setCustomerDetails ] = useState()
    let [ orderDetails, setOrderDetails ] = useState()
    let [ paymentDetails, setPaymentDetails ] = useState()

const navigate = useNavigate()


// set the payment variable
function setPaid_fun(e){
    const value = Math.max(0, Math.min(10000000000, Number(e.target.value)));
    setPaid(value);
};


// get the shift, sub_shift data and promocodes
// should check the holds in this step
useEffect(() => {
    const fetchData = async () =>{
        const shiftData = await get_shift()
        setShiftDetails(shiftData)

        const subShiftData = await get_sub_shift()
        setSubShiftDetails(subShiftData)

        const promoCodesData = await get_promo_codes()
        setAllPromoCodes(promoCodesData)
        
        const sessionData = await get_session_details(session_id)
        setSessionDetails(sessionData)
        setSelectedCategory(`1HR ${sessionData.product.nick_name}`)

        const customersData = await get_all_customers()
        setAllCustomers(customersData)
    }
    fetchData()
}, []);

useEffect(()=>{
    if( numberOfPlayers && selectedCategory && zoho_items){
        set_arr_options_fun()
    }
},[options, numberOfPlayers, selectedCategory, promotrue, promocode])

useEffect(()=>{
    if(bookingsuccess){
        // handleClose()
        set_alert(true)
    }
},[bookingsuccess])


useEffect(()=>{
    if(orderDetails){
        setPaid(orderDetails?.total_money?.amount/100 ?? 0)
    }
},[orderDetails])

// set Dictionary of selected options key:value 
function set_options_fun(e){ 

    set_options(options => ({
        ...options,
        [e.target.name]: e.target.value.length === 0 ? 0 : e.target.value
    }));
}

// set Array of options for bookeo and square and zoho
function set_arr_options_fun() {
    let zohoItemsList = [];
    let squareIdsList = [];


    // Add number of players to Zoho line items
    if (!(promocode && promocode.duration > 1)) {
        const baseRate = zoho_items[selectedCategory][1];
        const discountedRate = promocode && promocode.duration === 1 && promocode.square_pre > 0
            ? baseRate - (baseRate * Number(promocode.percentage) / 100)
            : baseRate;

        if (discountedRate > 0) {
        zohoItemsList.push({
            item_id: zoho_items[selectedCategory][0],
            quantity: numberOfPlayers,
            rate: discountedRate,
            tax_id: "5118629000000088105"
        });
        }
    }

    // Add options to Zoho line items
    for (const [key, value] of Object.entries(options)) {
        console.log(zoho_items)
        console.log(zoho_items[key])
        if (value !== 0) {
            const baseRate = zoho_items[key][1];
            const discountedRate = (promocode && !promotrue && promocode.square_pre > 0)
                ? baseRate - (baseRate * Number(promocode.percentage) / 100)
                : baseRate;

            if (discountedRate > 0) {
                zohoItemsList.push({
                    quantity: value.toString(),
                    item_id: zoho_items[key][0],
                    rate: discountedRate,
                    tax_id: "5118629000000088105"
                });
            }
        }
    }

    // Add number of players to Square options
    const baseSquareOption = {
        quantity: String(numberOfPlayers),
        catalog_object_id: allSquareItems[sessionDetails.product.nick_name][selectedCategory]
    };

    if (promocode && promotrue) {
        baseSquareOption.applied_discounts = [0];
    }

    squareIdsList.push(baseSquareOption);

    // Add options to Square options
    for (const [key, value] of Object.entries(options)) {
        if (value !== 0) {
            squareIdsList.push({
                quantity: value.toString(),
                catalog_object_id:
                    allSquareItems["Add On"][key] || allSquareItems[sessionDetails.product.nick_name + "+"][key]
            });
        }
    }

    // Set state once
    set_options_zoho_items(zohoItemsList);
    set_options_square_ids(squareIdsList);

    // Use useEffect to watch state if you want to log
    console.log("✅ Zoho Items:", zohoItemsList);
    console.log("✅ Square IDs:", squareIdsList);
}
	



  
  
function setSelectedCategory_fun(e){ 
    console.log("categoty of the session")
    console.log(test)
    console.log(e.target.value)
    setSelectedCategory(e.target.value)
}

async function Book(){
    set_isloading(true)
    
    let result = await create_payment_api({shiftDetails, orderDetails, paymentMethod, set_alert, set_message})
    if (result?.error) {
        return; // exit early if there's an error
    }
    let paymentData = await result
    
    await (paymentData.source_type === "CASH" ? pay_order_api({orderDetails, paymentData, set_alert, set_message}) : 0 );

    // let result2 = await create_sales_receipt({shiftDetails, orderDetails, paymentData, options_zoho_items, set_alert, set_message})
    //     if (result2?.error) {
    //     return; // exit early if there's an error
    // }
    // let salesReceiptData = await result2

    let result3 = await update_inventory({ shiftDetails, subShiftDetails, paymentData, options_square_items, note})
    console.log(result3)

}

// base_price_money


return (
<div>
{shiftDetails && sessionDetails && allCustomers &&
    <Grid container spacing={2} className="mt-0 w-100 d-flex flex-row justify-content-center" >
        <LoadingFun open={isloading} />
        <AlertFun open_alert={alert} set_open_alert={set_alert} message={message} />
            <Fragment >
                <AlertFun set_open_alert={set_alert} open_alert={alert} message={message} setLoading={(set_isloading)} />
                <h1 spacing={2} >{sessionDetails.product.nick_name}</h1>
                <Card className=" w-100 d-flex flex-row justify-content-center border-0 mt-0">
                    <Card className="w-50 max-vw-25 d-flex flex-column m-2 mt-0 border-0">      
                        {/* this is the name and the numbers field */}
                        <Card className="w-auto  d-flex flex-row justify-content-center border-0 p-2">
                                <Autocomplete
                                    disablePortal
                                    freeSolo
                                    id="combo-box-demo"
                                    options={allCustomers.map((customer)=>   customer.name )}
                                    className="form-control d-flex flex-column justify-content-start w-75 border-0 m-0 p-0"
                                    sx={{ width: 300 }}
                                    onInputChange={(event, newValue) => {
                                    // search customer on the first name
                                        // set_customer_fun(newValue)
                                        // get_customer_data(newValue)
                                        setCustomerDetails(newValue)
                                    }}
                                    renderInput={(params) => <TextField {...params} label="Customer Name" 
                                    />}
                                />
                            


                            <Input className='form-control d-flex flex-column justify-content-end w-25' value={numberOfPlayers} inputProps={{ min: 1 , max: sessionDetails.available_seats }} onChange={(e) => {setNumberOfPlayers(e.target.value)}} type="number"  name="number of players" label ="number of players"  step="1" />   
                            <FormControlLabel 
                            control={<Checkbox checked={promotrue} onChange={((e)=>{
                                set_promotrue(!promotrue)
                                
                            })} />}
                            />


                        </Card>


                        {/* we will read the categoty from sqaure using session_name like park category */}
                        <RadioGroup
                        row
                        aria-labelledby="demo-row-radio-buttons-group-label"
                        name="row-radio-buttons-group"
                        value={selectedCategory}
                        onChange={(e) => {
                            setSelectedCategory(e.target.value);
                        }}
                        >
                            {Object.entries(allSquareItems[sessionDetails.product.nick_name]).map(([key, val]) => (
                                <FormControlLabel
                                key={key}
                                label={key}
                                value={key} // Use the key to track selected item
                                control={<Radio />}
                                className="w-20 m-0 p-0"
                                />
                            ))}
                        </RadioGroup>



                        <Autocomplete
                            disablePortal
                            freeSolo
                            id="Promo Code"
                            options={allPromoCodes.map((promo_code)=>  promo_code.code )}
                            className="border-0 w-100 p-2"
                            sx={{ width: 3 }}
                            onInputChange={(event, newValue) => {
                                let promo_code = allPromoCodes.find((promo_code)=> promo_code.code === newValue)                                
                                if(promo_code){
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
                                id="Paid"
                                label= "Paid"
                                onChange= {(e) => {
                                    const value = Math.max(0, Math.min(10000000000, Number(e.target.value)));
                                    setPaid(value);
                                }}
                                className="from-control border-0 w-100 "
                                value={parseInt(paid)}
                                
                            />
                            <RadioGroup
                                    row
                                    aria-labelledby="demo-row-radio-buttons-group-label"
                                    name="row-radio-buttons-group"
                                    onChange={(e) => {
                                        setPaymentMethod(e.target.value)}}
                                    defaultValue="cash"
                                >
                                <FormControlLabel value="cash" control={<Radio />} label="Cash" className="w-50" />
                                <FormControlLabel value="creditcard" control={<Radio />} label="Credit" />
                            </RadioGroup>
                        </FormControl>



            
                        <Card className="w-auto  d-flex flex-row justify-content-center border-0 p-1" >
                            <Button   onClick={async () => {
                                            set_isloading(true)
                                            const result = await get_total_price({ shiftDetails, promocode, options_square_ids });
                                            set_isloading(false)
                                            if(result.error)
                                            {
                                                set_alert(true)
                                                set_message(result.error)
                                            }
                                            else{
                                                setOrderDetails(result)
                                                setTotalPrice(orderDetails?.total_money?.amount/100 ?? 0)
                                            }
 
                                        }} 
                            variant="outlined" className="w-50">Total Price</Button>
                            {/* <BookingAPI orderDetails={orderDetails} paymentDetails={paymentDetails} setPaymentDetails={setPaymentDetails} set_bookingsuccess={set_bookingsuccess} bookingsuccess={bookingsuccess} options={options}
                            set_options={set_options} numbers={numbers} selectedCategory={selectedCategory} promocode={promocode}
                            shiftDetails={shiftDetails} square_receipt_number={square_receipt_number} set_square_receipt_number={set_square_receipt_number}
                            promotrue={promotrue} set_arr_options_fun={set_arr_options_fun} paid={paid} paymentMethod={paymentMethod}
                            options_square_ids={options_square_ids} set_square_totalPrice={set_square_totalPrice} set_options_square_items={set_options_square_items} set_alert={set_alert}
                            set_message={set_message} customer={customer} totalPrice={totalPrice} options_square_items={options_square_items} options_zoho_items = {options_zoho_items}
                            session_id={session_id} arr_options={arr_options} note={note} squareCategoryItems={squareCategoryItems} squareCategories={squareCategories} 
                            set_customer={set_customer}  square_order_id={square_order_id}
                            set_square_order_id={set_square_order_id} payment_ids={payment_ids} set_payment_ids={set_payment_ids} set_booking_bookeo={set_booking_bookeo}
                            booking_bookeo={booking_bookeo} create_order_flag={create_order_flag} current_eventid = {session_id} subShiftDetails = {subShiftDetails} set_alert_threshold_amount = {set_alert_threshold_amount}
                            alert_threshold_amount = {alert_threshold_amount} set_options_zoho_items = {set_options_zoho_items}
                            /> */}
                            <Button onClick={Book} variant="outlined"  className="w-50">Book</Button>
                        
                        </Card>
                    </Card>

                    {/* Options */}
                    <Card className="w-50 max-vw-25 d-flex flex-column m-1 mt-0 border-0">

                        { [ ...Object.entries(allSquareItems["Add On"] || {}),
                            ...Object.entries(allSquareItems[sessionDetails.product.nick_name + "+"] || {})
                            ].map(([key, value])=>(
                        //Row For Each option
                        <Card className="w-auto  d-flex flex-row justify-content-center border-0 p-2" key={value}>
                            {/* Labels */}
                            <h1 className="form-control d-flex flex-column justify-content-start w-50 mt-2 border-0" key={value}>
                            {key}
                            </h1>
                            {/* number for each option */}
                             <Input className='form-control d-flex flex-column justify-content-start w-25 ' inputProps={{ min: 0, max: sessionDetails.available_seats }} onChange={(e) => {set_options_fun(e)}} type="number"  name={key} id={value}  step="1" />
                               
                        </Card>
                
                        ))} 
                        <TextField
                        id="outlined-multiline-flexible"
                        label="Notes"
                        multiline
                        maxRows={4}
                        // value={value}
                        className = "from-control border-0 w-100 p-2"
                        onChange={(e) => {
                            set_note( e.target.value)
                        }}
                        />
<Card className="w-auto  d-flex flex-row justify-content-center border-0 p-2">


                        <h4>{(orderDetails)?orderDetails.total_money.amount/100 : 0}</h4>
                        </Card>


                    </Card>
                </Card>    
							
            </Fragment>
    </Grid>

}
        </div>)

}
