/* eslint-disable react/jsx-no-undef */
import { Fragment, useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { app_api_get } from '../../components/logic/apis';
import { get_localstorage } from '../../components/logic/localstorage';
import { app_get } from '../../components/logic/app';


import {
	Avatar,
	Grid,
	IconButton,
	ListItem,
	ListItemAvatar,
	InputLabel,
	TextField,
	ListItemText,
	List as Mulist,
	CardContent,
	Typography,
	CardActions,
	Button,
	CardHeader,
	Input,
	Divider,
	div,
	Span,
	FormControl,
	FormLabel,
	RadioGroup,
	FormControlLabel,
	Radio,
	Checkbox,
	checkboxClasses,
} from '@mui/material';
import { Container } from '@mui/system';
import Card from 'react-bootstrap/Card';
import { useNavigate } from 'react-router-dom';
import Badge from '@mui/material/Badge';
import ButtonGroup from '@mui/material/ButtonGroup';
import MailIcon from '@mui/icons-material/Mail';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
// import Button from '@mui/material/Button';
import { get_shift, set_shift_fun, get_sub_shift, set_sub_shift_fun} from '../start_shift/shifts_functions';
import { ReactSearchAutocomplete } from 'react-search-autocomplete'
import * as React from 'react';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Slide from '@mui/material/Slide';
import { InvoicePrint } from '../booking/invoice';
import ResponsiveDialog from '../booking/alert'
import { get_user_and_jwt } from '../../components/logic/users';

export default function Options() {
	const navigate = useNavigate()
	const [open, setOpen] = React.useState(false);
	let [hide, set_hide] = useState(false);
	const [current_group, set_current_group] = useState();


	const handleClose = () => {
	  setOpen(false);
	};
	const handleToggle = () => {
	  setOpen(!open);
	};
	const handleCloseAlert = () => {
		if(bookingsucccess)
		{
			navigate("/")
		}
		else{
			set_alert(false);
		}
		};
		
		const Transition = React.forwardRef(function Transition(props, ref) {
			return <Slide direction="up" ref={ref} {...props} />;
		});
	// stop scrolling
	// document.body.style.overflow = "hidden"
	let [shift, setShift] = useState(null);
	let [sub_shift, set_sub_shift] = useState(null);
	let [options, setOptions] = useState({});
    let [firstPaid, set_firstPaid] = useState(0);
    let [firstPaid_method, set_firstPaid_method] = useState('cash');
    // let [payment, set_payment] = useState([]);
    // let [arr_options, set_arr_options] = useState([])
    let [alert, set_alert] = useState(false)
    let [message, set_message] = useState(true)
    let [totalprice, set_totalprice] = useState(0)
    let [options_square_ids, set_options_square_ids] = useState([])
    // let [bookbutton, set_bookbutton] = useState(false)
    let [square_receipt_number, set_square_receipt_number] = useState()
	let [square_order_id, set_square_order_id] = useState(null)
	let [payment_ids, set_payment_ids] = useState();
	let [bookingsucccess, set_bookingsucccess] = useState(false);
	let [options_square_items, set_options_square_items] = useState();
	let [updated_shift, set_updated_shift] = useState();
	let [options_zoho_items, set_options_zoho_items] = useState();
	let [zoho_items, set_zoho_items] = useState(JSON.parse(get_localstorage('zoho_items')))
    let [payment_for_square_api, set_payment_for_square_api] = useState(
        {
            "amount_money": {
            "amount": 0,
            "currency": "EGP"
            },
        
            "source_id": "",
            
    }
    )
    
	useEffect(() => {

		get_shift().then((data) => {
			setShift(data);
			(data.current_shift_id === null)?set_hide(true): set_hide(false)
			set_updated_shift(data)
		});

		get_sub_shift().then((data) => {
			set_sub_shift(data);
		});

		let current_group_data = app_get('current_group/')
		current_group_data.then((x) =>{
			console.log("current_group")
			console.log(x)
			console.log(x.cash_threshold_amount)
			console.log(x.visa_threshold_amount)
			set_current_group(x)
		})

	},[])

	

useEffect(()=>{

	if(square_receipt_number && !bookingsucccess )
	{
		if(firstPaid_method === "cash")
		{
			pay_order_api()
		}
		else{
			create_sales_receipt()
		}
		
	}
	
},[square_receipt_number])


useEffect(()=>{
	
	if((options_square_ids.length === Object.keys(options).length) && !bookingsucccess && options_square_ids.length !== 0 ) 
	{
		create_order_api()
	}
	
},[options_square_ids])



function create_order_api(){
	handleToggle()
	app_api_get('square/', {
		"request_type": "post",
		"url": "/orders",
		"payload": {
			"order": {
				"location_id": updated_shift.square_location_id,
				"line_items": options_square_ids,
				"state": "OPEN",
				"customer_id": updated_shift.customer_id
			}
	}}).then((response) => {
		handleClose()
		try
		{
			if(response.order.id)
			{

		set_square_order_id(response.order.id)
		set_totalprice(response.order.total_money.amount/100) 
		set_firstPaid(response.order.total_money.amount) 
		set_options_square_items(response.order.line_items)
			}
		}
		catch(error){

			set_alert(true)
			set_message(response.errors[0].detail)
		}

		

		
	  })
}
		  // send the Book API for bookeo and square
function create_payment_api(){
	handleToggle()
	app_api_get('square/', {
		"request_type": "post",
		"url": "/payments",
		"payload": {...payment_for_square_api, 
			"order_id": square_order_id,
			"location_id": updated_shift.square_location_id,
			"note": `Booking owner: ${get_user_and_jwt().user.username}`,
			"source_id" : (firstPaid_method === "cash")?"CASH": "EXTERNAL", 
			"amount" : firstPaid ,
			"amount_money": {
				"amount": firstPaid,
				"currency": "EGP"
				},
				"autocomplete": (firstPaid_method === "cash")?false: true, 
				"team_member_id": updated_shift.square_team_member_id,
				"customer_id": updated_shift.customer_id
		}
	}).then(response => {
		handleClose()
		if(response.payment){
			set_payment_ids(response.payment.id)
			set_square_receipt_number(response.payment.receipt_number)
			}
		else{
			set_alert(true)
			set_message(response.errors[0].detail)
		}

		})
	//  add the credit payment, the second payment
	
}
	  
	  
function pay_order_api(){
handleToggle()
app_api_get('square/', {
	"request_type": "post",
	"url": `/orders/${square_order_id}/pay`,
	"payload": {
		"payment_ids": [payment_ids]
} }
).then(response => {
	console.log("response")
	console.log(response.order)
	if(response.order){
		create_sales_receipt()
		
		}
	else{
		set_alert(true)
		set_message(response.errors[0].detail)
	}
	
	
		})
}

function update_inventory(){
console.log("update inventory")
    for(var item in options_square_items) {
		updated_shift.inventory[options_square_items[item].name].sold_at_square += parseInt(options_square_items[item].quantity)
    }

	if(firstPaid_method === 'cash')
        {
            updated_shift.shift_money_cash += parseInt(firstPaid)/100
            sub_shift.shift_money_cash += parseInt(firstPaid)/100
        }
        else if(firstPaid_method === 'creditCard')
		{
            updated_shift.shift_money_visa += parseInt(firstPaid)/100
            sub_shift.shift_money_visa += parseInt(firstPaid)/100
        }
	
        let old_options = (updated_shift.options2)? updated_shift.options2 : []
        let new_options = [{[square_receipt_number]: square_order_id}]
		updated_shift.options2 = [...old_options, ...new_options]

		

    set_shift_fun(updated_shift)
    set_sub_shift_fun(sub_shift)
	set_alert(true)
	set_message("The Booking is created")
	set_bookingsucccess(true)
	handleClose()
}

function create_sales_receipt(){
	const today = new Date();
	app_api_get('zoho/', {
		"request_type": "post",
		"url": "/salesreceipts",
		"payload": {
				"is_generic_customer": true,
				"customer_name": "Options Page",
				"date": today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0'),
			 "line_items": options_zoho_items,
			 "payment_mode":firstPaid_method ,
			 "custom_fields": [{
			   "label": "Product",
					   "value": "Park"
			 },
			   {
				 "label": "Gravity Branch",
				 "value": current_group.name
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

				}
			 ]
			 }
		
	}).then(response => {
		console.log(response)
		if (response.code == 0)
		{
			update_inventory()
		}
		else{
			set_alert(true)
			set_message(response.message)
		}

	})
}

function startOrder(){
	set_options_square_ids([])
	set_options_zoho_items([])
    for (const [key, value] of Object.entries(options)) {
		console.log(shift.inventory[key])
		console.log(value)
        set_options_square_ids(options_square_ids => (
            [
                ...options_square_ids,{   
        ["quantity"]: String(value),
        ["catalog_object_id"]: shift.inventory[key].id
        }]));

		set_options_zoho_items(options_zoho_items => (
			[
						...options_zoho_items,{   
				["quantity"]: (value).toString(),
				["item_id"]: zoho_items[key][0],
				["rate"]: zoho_items[key][1],
				"tax_id": "5118629000000088105"
				
			}]
		
		))
        }



}

function set_firstPaid_fun(e){
    const value = Math.max(0, Math.min(10000000000, Number(e.target.value)));
    set_firstPaid(value);
};
function compelete_order(){
	create_payment_api()	
}

	return (
		<div>
		{ (!hide)? shift &&
		<Grid container spacing={2} className='m-5 flex-column'>
		    <ResponsiveDialog 
            options_square_items = {options_square_items} set_square_order_id={set_square_order_id} set_payment_ids={set_payment_ids}
            square_receipt_number={square_receipt_number} updated_shift={updated_shift} square_totalprice={(totalprice)*100}
            firstPaid = {parseInt(firstPaid)/100} firstPaid_method ={firstPaid_method} 
            bookingsuccess={bookingsucccess} alert={alert} message={message} handleCloseAlert={handleCloseAlert}
            
            />
		<Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={open}
        onClick={handleClose}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
			<Grid container spacing={2} className='m-5 align-items-start flex-row'>
				{shift && Object.keys(shift.inventory).map((key, index) => {
					return (
						<Card key={key} className='w-25 d-flex flex-row border-0 m-2'>
						
								<h1 className='form-control d-flex flex-column justify-content-start w-50 mt-2 border-0' align='left'>
									{key}
								</h1>
								<Input
									// style={{ flex: 1 }}
									spacing={24}
									className='form-control d-flex flex-column justify-content-start w-25 '
									type='number'
									name={key}
									label={key}
									step='1'
									onChange={(e) => {
										console.log("----------397")
										console.log(key)
										setOptions({ ...options, [key]: (e.target.value >= 0 )? e.target.value : 0 });
									}}
								/>
							
						</Card>
					);
				})}
			</Grid>

						<FormControl className="p-2">
                            <TextField
                                required
                                id="First Paid"
                                label= "First Paid"
                                onChange= {set_firstPaid_fun}
                                className="from-control border-0 w-100 "
                                value={parseInt(firstPaid)/100}
                                defaultValue={parseInt(totalprice)/100}
                                
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
						<Card key="123" className='w-100 d-flex flex-row border-0 m-2'>		
						<Button variant='outlined' className="w-100" style={{ alignSelf: 'center' }} onClick={startOrder}>
							Total Price  = {totalprice}
						</Button>
						<Button variant='outlined' className="w-100" style={{ alignSelf: 'center' }} onClick={compelete_order}>
							Buy
						</Button>
						</Card>
			
		</Grid> :
		<div>Loading Your shift..., If you haven't started your shift yet, kindly do so.</div>
		}
		</div>
	);
}
