
import Typography from '@mui/material/Typography';

import Box from '@mui/material/Box';
import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { app_api_get } from '../../../components/logic/apis';
import { get_localstorage, set_localstorage } from '../../../components/logic/localstorage';

import { Avatar, Grid, IconButton, ListItem, ListItemAvatar,InputLabel, TextField, ListItemText, List as Mulist, CardContent, CardActions, Button, CardHeader, Input,Divider, div, Span, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Checkbox, checkboxClasses, CircularProgress } from '@mui/material';
import { Container } from '@mui/system';
import Card from 'react-bootstrap/Card';
import { useNavigate } from 'react-router-dom';
import Badge from '@mui/material/Badge';
import ButtonGroup from '@mui/material/ButtonGroup';
import MailIcon from '@mui/icons-material/Mail';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
// import Button from '@mui/material/Button';

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Slide from '@mui/material/Slide';
import * as React from 'react';
import { app_get, app_post } from '../../../components/logic/app';
// import { set_numbers_fun, set_payment_fun, delete_hold } from './update_inventory'
import { get_user_and_jwt } from '../../../components/logic/users';
import Autocomplete from '@mui/material/Autocomplete';
import { get_jwt } from '../../../components/logic/users';
import { get_shift, set_shift_fun, get_sub_shift, set_sub_shift_fun } from '../../start_shift/shifts_functions';
import Paper from '@mui/material/Paper';
import { experimentalStyled as styled } from '@mui/material/styles';
import Backdrop from '@mui/material/Backdrop';
import { Row, Col } from 'react-bootstrap';
import ResponsiveDialog from './alert'

let APP_BASE_URL = 'https://fobook.gravitycode.me/api/'




// eslint-disable-next-line no-undef
const Item = styled(Paper)(({ theme }) => ({
    ...theme.typography.body2,
    textAlign: 'center',
    color: theme.palette.text.primary,
    height: 40,
    lineHeight: '40px',
  }));



export default function SquareBook() {
    const navigate = useNavigate();

    let [deleted_from_square, set_deleted_from_square] = useState(false)
    let [date, set_date] = useState()
    let [time, set_time] = useState()
    let [message, set_message] = useState()
    let { square_order_id } = useParams();
    let [alert, set_alert] = useState(false)
    let [success, set_success] = useState(false)
    let [shift, set_shift] = useState()
    let [sub_shift, set_sub_shift] = useState()
    let [options, set_options] = useState()
    let [payment_ids, set_payment_ids] = useState()
    let [total_price, set_totalprice] = useState()
    let [total_price_method, set_totalprice_method] = useState()
    let [receipt_number, set_receipt_number] = useState()
    let [zoho_sales_receipt_id, set_zoho_sales_receipt_id] = useState()
    let [open, setOpen] = useState()
    
    const Transition = React.forwardRef(function Transition(props, ref) {
        return <Slide direction="up" ref={ref} {...props} />;
    });


useEffect(() => {
    get_shift().then((data) => {
        set_shift(data);
        console.log("shift ",data)
        console.log(data.options2)
    });
    get_order_from_square()

    get_sub_shift().then((data) => {
        set_sub_shift(data);
    });
}, [])

useEffect(()=>{
    if(payment_ids){
        get_payment_from_square()
    }
},[payment_ids])

useEffect(()=>{
if(success)
{
    handleClose()
    set_alert(true)
    set_message("Done")
}
}, [success])

useEffect(()=>{
if(deleted_from_square)
{
    update_inventory()
}
}, [deleted_from_square])


const handleClose = () => {
    setOpen(false);
  };
  const handleToggle = () => {
    setOpen(!open);
  };

function get_order_from_square(){
    app_api_get('square/', {
        "request_type": "get",
        "url": `/orders/${square_order_id}`,
        "payload": {}
        }
    ).then((response) => {
        if(response.order)
        {
            let date = new Date(response.order.updated_at)
            let date2 = date.getFullYear() + "/" + date.getMonth() + "/" + date.getDate()
            let time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
            
            set_options(response.order.line_items)
            set_payment_ids(response.order.tenders[0].payment_id)
            set_date(date2)
            set_time(time)
        }
        else{
            console.log("errrrrrrrrrrrrror")
        }
    })
}


function get_payment_from_square(){
app_api_get('square/', {
    "request_type": "get",
    "url": `/payments/${payment_ids}`,
    "payload":{},
    })
    .then(response => {    
        if(response.payment)
        {
            let zoho_id = response.payment.note.split('+')[1].split(' ')[2]
            set_zoho_sales_receipt_id(zoho_id)
            set_totalprice(response.payment.amount_money.amount/100)
            console.log("square_payment", response.payment.amount_money.amount/100)
            set_totalprice_method(response.payment.source_type)
            set_receipt_number(response.payment.receipt_number)
        }

    })
}


const handleCloseAlert = () => {
    handleClose()
    if(success){
        navigate('/oldbookings')
    }
    set_alert(false);
    };

      const PaperRow = ({ right, right_bold, left, left_bold }) => {
        if (right_bold) {
            right = <b>{right}</b>;
        }
        if (left_bold) {
            left = <b>{left}</b>;
        }
        return (
            <Row style={{ margin: '0 0 0px 0' }}>
                {right && <Col xs={6}>{right}</Col>}
                {left && (
                    <Col xs={6} style={{ textAlign: 'right' }}>
                        {left}
                    </Col>
                )}
            </Row>
        );
    };

    

async function update_inventory(){

    for(let item in options)
    {
        shift.inventory[options[item].name].refund += parseInt(options[item].quantity)
    }


    if(total_price_method === "CASH")
        {
            console.log("cash refunded")
            shift.refund_cash += total_price
            sub_shift.refund_cash += total_price
        }
        else{
            console.log("visa refunded ")
            shift.refund_visa += total_price
            sub_shift.refund_visa += total_price
        }


    let options_new = []
    for(let i in shift.options2)
    {
        console.log(Object.keys(shift.options2[i])[0])
        if(Object.keys(shift.options2[i])[0] !== receipt_number )
        {
            // console.log(i)
            options_new.push(Object.keys(shift.options2[i]))
        }
    }
    shift.options2 = []
    
    await set_shift_fun(shift)
    await set_sub_shift_fun(sub_shift)
    set_success(true)

}

function delete_booking_from_zoho(){
    if(zoho_sales_receipt_id)
    {
        app_api_get('zoho/', {
            "request_type": "delete",
            "url": `/salesreceipts/${zoho_sales_receipt_id}`,
            "payload":{},
        })
        .then(response => {    
        delete_booking_from_square()
        
        
        })
    }
    else{
        delete_booking_from_square()
    }


}

function delete_booking_from_square(){
    // retrive order to get the payment IDs
app_api_get('square/', {
    "request_type": "post",
    "url": `/refunds`,
    "payload": {
        "payment_id": payment_ids,
        "amount_money": {
            "currency": "EGP",
            "amount": total_price*100,
    } 
}}
).then(response => {
    if(response.refund)
    {
        if(response.refund.id)
        {
            set_deleted_from_square(true)
        }
        else{        
            set_alert(true)
            set_message(response.errors[0].detail)
        }  
    }

    else{        
        set_alert(true)
        set_message(response.errors[0].detail)
    }   
    }   
)
}


function check_pass_word(){
handleToggle()
let val = document.getElementById("outlined-basic").value
if(val !== shift.password)
{
    set_alert(true)
    set_message("Please enter a correct password")
}
else{
    delete_booking_from_zoho()
}

}
return (
    <Card className="m-5">
        <ResponsiveDialog alert={alert} handleCloseAlert={handleCloseAlert} message={message} />
        <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={open}
        onClick={handleClose}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    
        <Card>
        {/* <PageHeader title={` Customer Name ${booking.title}`} /> */}
        {/* <h4 className="h4 margin-left"> Customer Name: {booking.title}</h4> */}
        {/* <h4 className="h4 margin-left" >session: {booking.productName}  People: {booking.participants.numbers[0].number}</h4> */}
		{/* <PaperRow  right={booking.productName} /> */}
        <PaperRow  right={date} />
		<PaperRow  right={time} />
		<PaperRow right={`Account Owner `} left={get_user_and_jwt().user.username} />
		<PaperRow right='' left="" />
		{/* <PaperRow right='12315' /> */}
		<hr style={{ margin: '10px' }} />
		{ receipt_number && <PaperRow right={ ` Receipt: ${receipt_number}`} />}
		<hr style={{ margin: '10px' }} />
		
		{options &&

		options.map((res)=>(
			<PaperRow key={res.name} right={res.name} right_bold={true} left={`${res.quantity}  `} />
		))
		}
		
		<hr style={{ margin: '10px' }} />
		<PaperRow right='Total Price' right_bold={true} left={`  ${total_price}`} left_bold={true} />
		
		<PaperRow right={`Total Paid: ${total_price_method == "CASH"? "Cash" : "CreditCard"} `} right_bold={true} left={total_price} left_bold={true} />
		

		
        <Button variant="outlined" onClick={check_pass_word}>Refund This Booking</Button>
       
        <TextField id="outlined-basic" label="Password" variant="outlined" type="password"/>
           
        </Card>
        
        
    </Card>
  );
}