/* eslint-disable react/jsx-no-undef */
import { useEffect, useState } from 'react';
import { app_api_get } from '../../components/logic/apis';
import { get_localstorage } from '../../components/logic/localstorage';
import Card from 'react-bootstrap/Card';
import { useNavigate } from 'react-router-dom';
import { get_shift, get_sub_shift, set_shift, set_sub_shift, get_current_group} from '../../components/logic/shifts_functions_apis';
import * as React from 'react';
import { get_user_and_jwt } from '../../components/logic/users';
import { Grid, Input, Button, FormControl, TextField, RadioGroup, FormControlLabel, Radio   } from '@mui/material';
import LoadingFun from '../../components/ui/loading';
import AlertFun from '../../components/ui/alert';
import { InvoicePrint }  from '../../components/ui/booking_invoice';
import { app_post } from '../../components/logic/app';

export default function Options() {
	const navigate = useNavigate()
	const [isLoading, setIsLoading] = React.useState(false);
	const [currentGroup, setCurrentGroup] = useState();
		
	let [shiftDetails, setShiftDetails] = useState(null);
	let [subShiftDetails, setSubShiftDetails] = useState(null);
	let [options, setOptions] = useState({});
    let [firstPaid, setFirstPaid] = useState(0);
    let [paymentMethod, setPaymentMethod] = useState('cash');
    let [alert, setAlert] = useState(false)
    let [alertMessage, setAlertMessage] = useState(true)
    let [totalPrice, setTotalPrice] = useState(0)
    let [squareLineItems, setSquareLineItems] = useState([])
	let [bookingsuccess, set_bookingsuccess] = useState(false);
	let [zohoItems, setZohoItems] = useState();
	let [zohoAllItems, ] = useState(JSON.parse(get_localstorage('zohoItems')))
	let [zoho_sales_receipt_id, set_zoho_sales_receipt_id] = useState()
	let [zoho_sales_receipt_number, set_zoho_sales_receipt_number] = useState()
	let [payment, setPayment] = useState()
	let [val, set_val] = useState()
	let [ orderDetails, setOrderDetails ] = useState()
	let [ customItem, setCustomItem ] = useState(
		{
			"name": "Custom Item",
			"quantity": "1",
			"base_price_money": {
			"amount": 0,
			"currency": "EGP"
			}

		})
    
	useEffect(() => {
		const fetchData = async () => {
			const shiftData = await get_shift();
			setShiftDetails(shiftData);

			const subShiftData = await get_sub_shift();
			setSubShiftDetails(subShiftData);

			const groupName = await get_current_group();
			setCurrentGroup(groupName)
		};
		fetchData();
	},[])

	useEffect(()=>{
		if(((squareLineItems.length === Object.keys(options).length) || squareLineItems.length === Object.keys(options).length+1) && !bookingsuccess && squareLineItems.length !== 0 ) 
		{
			create_order_api()
		}
	},[squareLineItems, zohoItems])

	function create_order_api(){
		setIsLoading(true)
		app_api_get('square/', {
			"request_type": "post",
			"url": "/orders",
			"payload": {
				"order": {
					"location_id": shiftDetails.square_location_id,
					"line_items": squareLineItems,
					"state": "OPEN",
					"customer_id": shiftDetails.customer_id
				}
		}}).then((response) => {
			setIsLoading(false)
			if(response.order)
			{

			// set_square_order_id(response.order.id)
			setTotalPrice(response.order.total_money.amount/100) 
			setFirstPaid(response.order.total_money.amount) 
			setOrderDetails(response.order)
			}
			else{
				setAlert(true)
				setAlertMessage(response.errors[0].detail)
			}
			})
	}
	
	// send the Book API for bookeo and square
	async function create_payment_api(){
		let data = {
			"order_id": orderDetails.id,
			"location_id": shiftDetails.square_location_id,
			"note": `Booking owner: ${shiftDetails.user.username}`,
			"source_id" : (paymentMethod === "cash")?"CASH": "EXTERNAL", 
			"amount" : orderDetails.total_money.amount ,
			"amount_money": {
            "amount": orderDetails.total_money.amount,
            "currency": "EGP"
            },
				"team_member_id": shiftDetails.square_team_member_id,
				"customer_id": shiftDetails.customer_id
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

		if(response.payment){
			setPayment(response.payment)
			return response.payment
		}
		else if (response.error){
        setAlert(true);
        setAlertMessage(response.error)
        return; 
    }
    else if (response.errors) {
        setAlert(true);
        setAlertMessage(`${response.errors[0].detail} - ${response.errors[0].field}`)
        return; 
    }
		
	}

	async function update_inventory(payment_result){
		let updatedShiftData = await shiftDetails
		let updatedSubShiftData = await subShiftDetails
		await orderDetails.line_items.forEach(item => {
			if(updatedShiftData.inventory[item.name]){
				updatedShiftData.inventory[item.name].sold_at_square += parseInt(item.quantity)
			}
		})

		if(paymentMethod === 'cash')
			{
				updatedShiftData.shift_money_cash += await parseInt(firstPaid)/100
				updatedSubShiftData.shift_money_cash += await parseInt(firstPaid)/100
			}
			else if(paymentMethod === 'creditcard')
			{
				updatedShiftData.shift_money_visa += await parseInt(firstPaid)/100
				updatedSubShiftData.shift_money_visa += await parseInt(firstPaid)/100
			}
		
			let old_options = await (updatedShiftData.options2)? updatedShiftData.options2 : []
			let new_options = await [{[payment_result.receipt_number]: orderDetails.id}]
			updatedShiftData.options2 = await [...old_options, ...new_options]

			

		await set_shift(updatedShiftData)
		await set_sub_shift(updatedSubShiftData)
		await create_booking_in_backend(payment_result)
		set_bookingsuccess(true)
		setIsLoading(false)
	}

	function create_sales_receipt({payment_result}){
		const today = new Date();
		app_api_get('zoho/', {
			"request_type": "post",
			"url": "/salesreceipts",
			"payload": {
					"is_generic_customer": true,
					"customer_name": "Options Page",
					"date": today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0'),
				"line_items": zohoItems,
				"payment_mode":paymentMethod ,
				"custom_fields": [{
				"label": "Product",
						"value": "Park"
				},
				{
					"label": "Gravity Branch",
					"value": currentGroup.name
				},
				{
					"label": "Staff Name",
					"value": get_user_and_jwt().user.username
					},
					{
					"label": "Date and Time",
					"value": today.getFullYear() + "-" + 
					String(today.getMonth() + 1).padStart(2, '0') + "-" + 
					String(today.getDate()).padStart(2, '0') + " " + 
					String(today.getHours()).padStart(2, '0') + ":" + 
					String(today.getMinutes()).padStart(2, '0') + ":" + 
					String(today.getSeconds()).padStart(2, '0'),

					},
					{
					"label": "Square receipt number",
					"value": payment_result.receipt_number
					}
				]
				}
			
		}).then(response => {
			if (response.code === 0)
				{
					set_zoho_sales_receipt_id(response.sales_receipt_details.sales_receipt_id)	
					set_zoho_sales_receipt_number(response.sales_receipt_details.receipt_number)
				}
			else{
				set_zoho_sales_receipt_id(true)
			}
		})
	}

	function startOrder(){
		setSquareLineItems([])
		setZohoItems([])
		for (const [key, value] of Object.entries(options)) {
			setSquareLineItems(squareLineItems => (
				[
					...squareLineItems,{   
			["quantity"]: String(value),
			["catalog_object_id"]: shiftDetails.inventory[key].id
			}]));

			if(value[0] !== 0){
			setZohoItems(zohoItems => (
				[
							...zohoItems,{   
					["quantity"]: (value).toString(),
					["item_id"]: zohoAllItems[key][0],
					["rate"]: zohoAllItems[key][1],
					"tax_id": "5118629000000088105"
					
				}]
			
			))
			}
			}

		if(customItem.base_price_money.amount > 0 && customItem.name !== ""){
			setSquareLineItems(prev => [...prev, customItem])
			setZohoItems(prev => [...prev, 
				{
				name: customItem.name,
				quantity: 1,
				rate: customItem.base_price_money.amount/1.14,
				tax_id: "5118629000000088105"
				}
			])
		}
	}

	async function create_booking_in_backend(payment_result){
		let data = {
		options: orderDetails.line_items,
        payment: {
            amount: payment_result.amount_money.amount/100,
            method: (payment_result.source_type === 'CASH')? 'cash' : 'creditcard',
            promoCode: "" ,
            percentage: ""
        },
        number_of_players: 0,
        creation_agent: shiftDetails.user.username,
        created_at: orderDetails.created_at,
        square_receipt_number: payment_result.receipt_number,
        square_payment_id: payment_result.id,
        square_order_id: orderDetails.id,
        zoho_sales_receipt_id: zoho_sales_receipt_id,
        zoho_sales_receipt_num: zoho_sales_receipt_number,
        status: "done"
		}
		await app_post(`booking/`, data)
	}

	function setFirstPaid_fun(e){
		const value = Math.max(0, Math.min(10000000000, Number(e.target.value)));
		setFirstPaid(value);
	};

	async function compelete_order(){
		setIsLoading(true)
		let payment_result  = await create_payment_api()
		await create_sales_receipt({payment_result})
		await update_inventory(payment_result)
	}

	const handleAddInput = (key) => {
		
		if(options[key] === undefined)
		{
			setOptions({ ...options, [key]: [1] })
		}
		else{
			
			let value = options[key][0] +1
			setOptions(options => ({
				...options,
				[key]: [value ]
			}));
		}
	};

	return (
		<div>
		{  
		(shiftDetails && shiftDetails.current_shift_id )? 

		<Grid container spacing={2} className="p-4 justify-content-center">
			<LoadingFun open={isLoading} />
			<AlertFun set_open_alert={setAlert} open_alert={alert} message={alertMessage} setLoading={(setIsLoading)} />			{ orderDetails && payment && bookingsuccess &&
			<div className='justify-content-center' style={{ width: '100mm' }}>
			<InvoicePrint  shift={
			{square_receipt_number: payment.receipt_number,
				branch_name: shiftDetails.branch_name,
				location_name: shiftDetails.location_name,
				city: shiftDetails.city,
				total_price: payment.amount_money.amount/100,
				first_paid: payment.amount_money.amount/100,
				first_paid_method: payment.source_type,
				options: orderDetails.line_items,
				dateTime: orderDetails.created_at,
				discount: (orderDetails.discounts)?orderDetails.discounts[0].percentage:null,
				bookingsuccess: bookingsuccess,
				creation_agent: shiftDetails.user.username
			}} note={val} set_note={set_val}/>
				<Button onClick={() => navigate('/')}> Close </Button>
			</div>
			}

			{!bookingsuccess &&
			
			<> 
			{shiftDetails && Object.keys(shiftDetails.inventory).map((key, index) => (
				<Grid item xs={12} sm={6} md={4} key={key}>
					<Card
					className="p-3 d-flex flex-row gap-3"
					sx={{ display: 'flex', flexDirection: 'column' }}
					>
						<Button
								variant="outlined"
								onClick={() => handleAddInput(key)}
								size="small"
								sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
								>
								{key} ➕
						</Button>

						{(options[key] || ['']).map((value, idx) => (
							<Input
							key={idx}
							fullWidth
							type="number"
							value={value}
							label={`${key} ${idx + 1}`}
							onChange={(e) => {
								setOptions(options => ({
									...options,
									[key]: (parseInt(e.target.value) > 0) ? [parseInt(e.target.value)] : [0]
								}))
								
							}}
							/>
						))}
					</Card>
				</Grid>
			))}
			<div className="d-flex flex-row pt-3 gap-2 justify-content-center w-50">
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
			<FormControl  spacing={2} className="p-4 w-100">
				<TextField
				required
				id="First Paid"
				label="First Paid"
				onChange={setFirstPaid_fun}
				className="from-control border-0 w-100"
				value={parseInt(firstPaid) / 100}
				/>
				<RadioGroup
						row
						aria-labelledby="demo-row-radio-buttons-group-label"
						name="row-radio-buttons-group"
						onChange={(e) => setPaymentMethod(e.target.value)}
						defaultValue="cash"
					>
					<FormControlLabel value="cash" control={<Radio />} label="Cash" className="w-50" />
					<FormControlLabel value="creditcard" control={<Radio />} label="Credit" />
				</RadioGroup>
            </FormControl>
			<Card key="123" className='w-100 d-flex flex-row border-0 m-2'>		
				<Button variant='outlined' className="w-100" style={{ alignSelf: 'center' }} onClick={startOrder}>
					Total Price  = {totalPrice}
				</Button>
				<Button variant='outlined' className="w-100" style={{ alignSelf: 'center' }} onClick={compelete_order}>
					Buy
				</Button>
			</Card>
			</>}
		</Grid>
		 
		:
		<div>Loading Your shiftDetails..., If you haven't started your shiftDetails yet, kindly do so.</div>
		}
		</div>
	);
}
