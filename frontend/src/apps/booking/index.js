import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { get_localstorage, set_localstorage } from '../../components/logic/localstorage';
import { Grid, TextField, Button, Input, FormControl, RadioGroup, FormControlLabel, Radio, Checkbox } from '@mui/material';
import Card from 'react-bootstrap/Card';
import Autocomplete from '@mui/material/Autocomplete';
import { get_shift, get_sub_shift } from '../../components/logic/shifts_functions_apis'
import LoadingFun from '../../components/ui/loading';
import AlertFun from '../../components/ui/alert';
import { get_promo_codes, get_session_details, get_all_customers, delete_booking_on_error } from './functions_apis';
import { get_total_price, create_payment_api, create_sales_receipt, add_to_inventory, create_hold_booking, create_customer, create_booking, delete_hold_booking } from '../../components/logic/booking_functions';
import { InvoicePrint } from '../../components/ui/booking_invoice';


export default function Booking() {
    let date = new Date()
	let { session_id } = useParams()
    let [sessionsDetails, setSessionsDetails ] = useState([])
    let [isLoading, setIsLoading] = useState(false);
    let [selectedOptions, setSelectedOptions] = useState({});
    let [note, setNote] = useState();
    let [allPromoCodes, setAllPromoCodes] = useState([]);
    let [promoCode, setSelectedPromoCode] = useState();
    let [paid, setPaid] = useState(0);
    let [paymentMethod, setPaymentMethod] = useState('cash');
    let [alert, setAlert] = useState(false)
    let [alertMessage, setAlertMessage] = useState()
    let [shiftDetails, setShiftDetails] = useState();
    let [ allSquareItems ] = useState(JSON.parse(get_localstorage('squareItems')))
    let [allZohoItems] = useState(JSON.parse(get_localstorage('zohoItems')))
    let [selectedSquareItems, setSelectedSquareItems] = useState([])
    let [selectedZohoItems, setSelectedZohoItems] = useState([])
    let [bookingSuccess, setBookingSuccess] = useState(false)
    let [promotrue, set_promotrue] = useState(false)
    let [selectedCategory, setSelectedCategory] = useState()
    let [numberOfPlayers, setNumberOfPlayers] = useState(1)
    const [subShiftDetails, setSubShiftDetails] = useState();
    let [ allCustomers, setAllCustomers ] = useState()
    let [ customerName, setCustomerName ] = useState(
    date.getFullYear() + "/" + (Number(date.getMonth())+1) + "/" + date.getDate() + ' ' +
    date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
    )
    let [ orderDetails, setOrderDetails ] = useState()
    let [ paymentDetails, setPaymentDetails ] = useState()
    let [ bookingDetails, setBookingDetails ] = useState()
    let [ salesReceiptDetails, setSalesReceiptDetails] = useState()
    let [ customItem, setCustomItem ] = useState(
        {
            "name": "Custom Item",
            "quantity": "1",
            "base_price_money": {
            "amount": 0,
            "currency": "EGP"
            }

        })


// get the shift, sub_shift data and promoCodes
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
        setSessionsDetails(sessionData)
        setSelectedCategory(`1HR ${sessionData[0].product.nick_name}`)

        // const customersData = await get_all_customers()
        setAllCustomers([])

    }
    fetchData()
}, [session_id]);




useEffect(()=>{
    if( numberOfPlayers && selectedCategory && allZohoItems && customItem){
        set_options_for_apis()
    }
},[selectedOptions, numberOfPlayers, selectedCategory, promotrue, promoCode, allZohoItems, customItem])

useEffect(()=>{
    if(orderDetails){
        setPaid(orderDetails?.total_money?.amount/100 ?? 0)
    }
},[orderDetails])

useEffect(() => {
    const handleBooking = async () => {

        if (bookingDetails?.type_of_players && !bookingSuccess) {
            let result = await null

            const times = promoCode?.duration || 1;
            for(let i=0 ; i < times ; i++){
            
                let round = i
                result = await create_booking({ sessionsDetails, bookingDetails, round });
            }

            if (result.error) {
                let paymentData = paymentDetails
                let zohoReceiptID = salesReceiptDetails?.id
                delete_booking_error({paymentData, zohoReceiptID})
                setAlert(true)
                setAlertMessage(result.error)
                
            }
            else{
                setBookingSuccess(true);
            }
        }
    };

    handleBooking();
}, [bookingDetails, sessionsDetails, promoCode, paymentDetails, salesReceiptDetails]);

useEffect(()=>{
    if(bookingSuccess && paymentDetails)
    {
        setIsLoading(false)
    }
},[bookingSuccess, paymentDetails])


// set Dictionary of selected selectedOptions key:value 
function set_selected_options(e){ 
    setSelectedOptions(selectedOptions => ({
        ...selectedOptions,
        [e.target.name]: e.target.value.length === 0 ? 0 : e.target.value
    }));
}

// set Array of selectedOptions for bookeo and square and zoho
function set_options_for_apis() {
    let zohoItemsList = [];
    let squareIdsList = [];

    // add the custom Item to zoho ans square
    if(customItem.base_price_money.amount > 0 && customItem.name !== ""){
        squareIdsList.push(customItem)
        zohoItemsList.push({
            name: customItem.name,
            quantity: 1,
            rate: customItem.base_price_money.amount/1.14,
            tax_id: "5118629000000088105"
    })
    }

    // Add number of players to Zoho line items
    const baseRate = allZohoItems[selectedCategory][1];
    const discountedRate = promoCode && promoCode.duration === 1 && promoCode.square_pre > 0
        ? baseRate - (baseRate * Number(promoCode.percentage) / 100)
        : baseRate;
    if (discountedRate > 0) {
    zohoItemsList.push({
        item_id: allZohoItems[selectedCategory][0],
        quantity: numberOfPlayers,
        rate: discountedRate,
        tax_id: "5118629000000088105"
    });
    }
    

    // Add selectedOptions to Zoho line items
    for (const [key, value] of Object.entries(selectedOptions)) {
        if (value != "0") {
            const baseRate = allZohoItems[key][1];
            const discountedRate = (promoCode && !promotrue && promoCode.square_pre > 0)
                ? baseRate - (baseRate * Number(promoCode.percentage) / 100)
                : baseRate;

            if (discountedRate > 0) {
                zohoItemsList.push({
                    quantity: value.toString(),
                    item_id: allZohoItems[key][0],
                    rate: discountedRate,
                    tax_id: "5118629000000088105"
                });
            }
        }
    }

    // Add number of players to Square selectedOptions
    const baseSquareOption = {
        quantity: String(numberOfPlayers),
        catalog_object_id: allSquareItems[sessionsDetails[0].product.nick_name][selectedCategory]
    };

    if (promoCode && promotrue) {
        baseSquareOption.applied_discounts = [0];
    }

    squareIdsList.push(baseSquareOption);

    // Add selectedOptions to Square selectedOptions
    for (const [key, value] of Object.entries(selectedOptions)) {
        if (value !== "0") {
            squareIdsList.push({
                quantity: value.toString(),
                catalog_object_id:
                    allSquareItems["Add On"][key] || allSquareItems[sessionsDetails[0].product.nick_name + "+"][key]
            });
        }
    }

    // Set state once
    setSelectedZohoItems(zohoItemsList);
    setSelectedSquareItems(squareIdsList);

    // Use useEffect to watch state if you want to log
    // console.log("✅ Zoho Items:", zohoItemsList);
    // console.log("✅ Square IDs:", squareIdsList);
}

async function hold_booking(){
    setIsLoading(true)
    let result = await get_total_price({ shiftDetails, promoCode, selectedSquareItems });
    if(result.error)
    {
        setAlert(true)
        setAlertMessage(result.error)
        return;
    }
    else{
        setOrderDetails(result)
    }
    
    // check if the hold booking is already created
    const result2 = await create_hold_booking({bookingDetails, session_id, numberOfPlayers })
    if(result2.error){
        setAlert(true)
        setAlertMessage(result2.error)
        return;
    }
    else{
        set_localstorage('bookingId', result2.id)
    }
    setBookingDetails(result2)
    setIsLoading(false)
}

// this function will be used to delete the booking if an error is occured
async function delete_booking_error({paymentData, zohoReceiptID}){
    
    delete_booking_on_error({paymentData, shiftDetails, zohoReceiptID})
    let bookingId = get_localstorage('bookingId')
    if(bookingId)
    {
        delete_hold_booking({bookingId})
    }
}

async function Book(){
    setIsLoading(true)
    let salesReceiptData = {}
    
    // create the payment in square
    let create_payment_api_result = await create_payment_api({shiftDetails, orderDetails, paymentMethod})
    if (create_payment_api_result.error) {
        setAlert(true);
        setAlertMessage(create_payment_api_result.error)
        return; 
    }
    if (create_payment_api_result.errors) {
        setAlert(true);
        setAlertMessage(`${create_payment_api_result.errors[0].detail} - ${create_payment_api_result.errors[0].field}`)
        return; 
    }
    let paymentData = await create_payment_api_result.payment
    setPaymentDetails(paymentData)

    // create sales receipt in zoho
    if(selectedZohoItems && selectedZohoItems.length > 0){
    let result2 = await create_sales_receipt({shiftDetails, orderDetails, paymentData, selectedZohoItems})
    if (result2.code !== 0)
    {
        delete_booking_error({paymentData})
        setAlert(true)
        setAlertMessage("This error from zoho: "+result2.message)
        return;
    }
    salesReceiptData = await result2
    setSalesReceiptDetails(salesReceiptData)
    }

    // update inventory
    const options = orderDetails.line_items
    await add_to_inventory({ shiftDetails, subShiftDetails, paymentData, options, note})

    // create the customer
    let customerData = await create_customer({customerName})
    if(customerData.error){
        setAlert(true)
        setAlertMessage(customerData.error || "error1")
        return;
    }
    

    setBookingDetails(prev => ({
        ...prev,
        booking_customer: customerData.id,
        options: orderDetails.line_items,
        payment: {
            amount: paid,
            method: (paymentData.source_type === 'CASH')? 'cash' : 'creditcard',
            promoCode: promoCode?.name ,
            percentage: promoCode?.percentage
        },
        number_of_players: numberOfPlayers,
        type_of_players: selectedCategory,
        creation_agent: shiftDetails.user.username,
        created_at: orderDetails.created_at,
        square_receipt_number: paymentData.receipt_number,
        square_payment_id: paymentData.id,
        square_order_id: orderDetails.id,
        zoho_sales_receipt_id: (salesReceiptData)?salesReceiptData?.sales_receipt_details?.sales_receipt_id : null,
        zoho_sales_receipt_num: (salesReceiptData)?salesReceiptData?.sales_receipt_details?.receipt_number : null,
        note: (note)?note: null,
        status: "done"
        }));

}



return (
    <div>
        {shiftDetails && sessionsDetails[0] && allCustomers &&
        
            <Grid container spacing={2} className="mt-0 w-100 d-flex flex-row justify-content-center" >
                <LoadingFun open={isLoading} />
                <AlertFun set_open_alert={setAlert} open_alert={alert} message={alertMessage} setLoading={(setIsLoading)} />
                {bookingSuccess &&  <InvoicePrint style={{ padding: "2px 6px", minWidth: "auto" }} shift={
                    {square_receipt_number: paymentDetails.receipt_number,
                        branch_name: shiftDetails.branch_name,
                        location_name: shiftDetails.location_name,
                        city: shiftDetails.city,
                        total_price: paymentDetails.total_money.amount / 100,
                        first_paid: paymentDetails.total_money.amount / 100,
                        first_paid_method: (paymentDetails.source_type === 'CASH')?"cash":"creditcard",
                        options: orderDetails.line_items,
                        discount: promoCode?.name,
                        dateTime: orderDetails.created_at,
                        creation_agent: shiftDetails.user.username
                        // alert_threshold_amount : data.alert_threshold_amount
                    }
                } note={note} setNote={setNote}/>}
                {!bookingSuccess && 
                    <Fragment >
                        <h1 spacing={2} >{sessionsDetails[0].product.nick_name}</h1>
                        <Card className=" w-100 d-flex flex-row justify-content-center border-0 mt-0">
                            <Card className="w-50 max-vw-25 d-flex flex-column m-2 mt-0 border-0">      
                                {/* this is the name and the numbers field */}
                                <Card className="w-auto  d-flex flex-row justify-content-center border-0 p-2">
                                    <Autocomplete
                                    disablePortal
                                    freeSolo
                                    id="combo-box-demo"
                                    options={allCustomers.map((customer) => customer.identifier || '')} // Ensure no undefined
                                    value={customerName} // Default to empty string
                                    onInputChange={(event, newInputValue) => {
                                    if (newInputValue && newInputValue.trim() !== '') {
                                        setCustomerName(newInputValue);
                                    }
                                    }}                                    
                                    renderInput={(params) => <TextField {...params} label="Customer Name" />}
                                    sx={{ width: 300 }}
                                    className="form-control d-flex flex-column justify-content-start w-75 border-0 m-0 p-0"
                                    />
                                    <Input className='form-control d-flex flex-column justify-content-end w-25' value={numberOfPlayers} inputProps={{ min: 1 , max: sessionsDetails[0].available_seats }} onChange={(e) => {setNumberOfPlayers(Number(e.target.value))}} type="number"  name="number of players" label ="number of players"  step="1" />   
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
                                    {Object.entries(allSquareItems[sessionsDetails[0].product.nick_name]).map(([key, val]) => (
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
                                            setSelectedPromoCode(promo_code)
                                        }
                                        else{
                                            setSelectedPromoCode()
                                        }
                                    }}
                                    renderInput={(params) => <TextField {...params} label="Promo Code" />}
                                />

                                <FormControl className="p-2">
                                    <TextField
                                    required
                                    id="Paid"
                                    label="Paid, this field is read only, should be updaed from total price button"
                                    className="form-control border-0 w-100"
                                    value={parseInt(paid)}
                                    InputProps={{
                                        readOnly: true,
                                    }}
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
                                <div className="d-flex flex-row p-2">
                                <TextField
                                        required
                                        id="Custom Field Name"
                                        label= "Custom Field Name"
                                        onChange= {(e) => {
                                            setCustomItem(prev => ({
                                            ...prev,
                                            name:e.target.value}))
                                        }}
                                        className="from-control border-0 w-100 "
                                        value={customItem.name}
                                        
                                    />
                                <TextField
                                        required
                                        id="Custom Field Price"
                                        label= "Custom Field Price"
                                        onChange= {(e) => {
                                            setCustomItem(prev => ({
                                            ...prev,
                                            base_price_money:{
                                                "amount": e.target.value*100,
                                                "currency": "EGP"
                                            }}))
                                        }}
                                        className="from-control border-0 w-100 "
                                        value={customItem.base_price_money.amount/100}
                                        
                                    />
                                </div>
                                <Card className="w-auto  d-flex flex-row justify-content-center border-0 p-1" >
                                    <Button   onClick={() => {hold_booking()}} variant="outlined" className="w-50">Total Price</Button>
                                    <Button onClick={Book} variant="outlined"  className="w-50">Book</Button>                        
                                </Card>
                            </Card>

                            {/* Options */}
                            <Card className="w-50 max-vw-25 d-flex flex-column m-1 mt-0 border-0">

                                { [ ...Object.entries(allSquareItems["Add On"] || {}),
                                    ...Object.entries(allSquareItems[sessionsDetails[0].product.nick_name + "+"] || {})
                                    ].map(([key, value])=>(
                                    //Row For Each option
                                    <Card className="w-auto  d-flex flex-row justify-content-center border-0 p-2" key={value}>
                                        {/* Labels */}
                                        <h1 className="form-control d-flex flex-column justify-content-start w-50 mt-2 border-0" key={value}>
                                        {key}
                                        </h1>
                                        {/* number for each option */}
                                        <Input className='form-control d-flex flex-column justify-content-start w-25 ' inputProps={{ min: 0, max: sessionsDetails[0].available_seats }} onChange={(e) => {set_selected_options(e)}} type="number"  name={key} id={value}  step="1" />
                                        
                                    </Card>
                        
                                ))} 
                                <TextField
                                    id="outlined-multiline-flexible"
                                    label="Notes"
                                    multiline
                                    maxRows={4}
                                    className = "from-control border-0 w-100 p-2"
                                    onChange={(e) => {
                                        setNote( e.target.value)
                                    }}
                                />
                                <Card className="w-auto  d-flex flex-row justify-content-center border-0 p-2">


                                    <h4>{(orderDetails)?orderDetails.total_money.amount/100 : 0}</h4>
                                </Card>


                            </Card>
                        </Card>                    
                    </Fragment>
                }
            </Grid>

        }
    </div>)

}
