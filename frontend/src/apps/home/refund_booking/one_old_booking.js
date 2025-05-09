
import Typography from '@mui/material/Typography';

import Box from '@mui/material/Box';
import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { app_api_get } from '../../../components/logic/apis';
import { get_localstorage, set_localstorage } from '../../../components/logic/localstorage';
import Backdrop from '@mui/material/Backdrop';
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

import { Row, Col } from 'react-bootstrap';
import ResponsiveDialog from './alert'
import { InvoicePrint } from './invoice'

let APP_BASE_URL = 'https://fo.gravitycode.me/api/'




// eslint-disable-next-line no-undef
const Item = styled(Paper)(({ theme }) => ({
    ...theme.typography.body2,
    textAlign: 'center',
    color: theme.palette.text.primary,
    height: 40,
    lineHeight: '40px',
  }));



export default function MyApp() {
    const navigate = useNavigate();
    let [booking, set_booking] = useState()
    let [date, set_date] = useState()
    let [time, set_time] = useState()
    let [message, set_message] = useState()
    let { booking_id } = useParams();
    let [alert, set_alert] = useState(false)
    let [success, set_success] = useState(false)
    let [deleted_from_square, set_deleted_from_square] = useState(false)
    let [shift, set_shift] = useState()
    let [sub_shift, set_sub_shift] = useState()
    let [options, set_options] = useState()
    let [payment_ids, set_payment_ids] = useState()
    let [total_price, set_totalprice] = useState()
    let [total_price_method, set_totalprice_method] = useState()
    const [val, set_val] = useState()
    const [open, setOpen] = useState(false);
    

    const Transition = React.forwardRef(function Transition(props, ref) {
        return <Slide direction="up" ref={ref} {...props} />;
    });


useEffect(() => {
    console.log("get booking details")
    get_booking_from_bookeo()
    get_shift().then((data) => {
        set_shift(data);
        console.log("shift ",data)
    });

    get_sub_shift().then((data) => {
        set_sub_shift(data);
    });

}, [])

useEffect(()=>{

    if(deleted_from_square)
    {
        update_inventory()
    }
},[deleted_from_square])

useEffect(()=>{

    if(success)
    {
        handleClose()
        set_message("Done") 
        set_alert(true)
    }
},[success])

useEffect(()=>{
    if(booking){
        get_order_from_square()
    }
},[booking])


useEffect(()=>{
    if(payment_ids){
        get_payment_from_square()
    }
},[payment_ids])

const handleClose = () => {
    setOpen(false);
  };
  const handleToggle = () => {
    setOpen(!open);
  };

function get_booking_from_bookeo(){
    app_api_get('bookeo/', {
        "request_type": "get",
        "url": `/bookings/${booking_id}`,
        "payload": { },
        }).then((response) => { 
        // console.log("booking", response)
        if(response.canceled)
        {
            // console.log("yesssssssssssssssss")
            set_alert(true)
            set_message("This Booking is already Canceled")
        }
        else{
            set_booking(response)
        }
        
        var date = new Date(response.startTime);
        var date2 = date.getDate()+'/' + (date.getMonth()+1) + '/' + date.getFullYear();
        set_date (date2)

        var time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
        console.log(time)
        set_time(time)


    })
    
}

function get_order_from_square(){
    app_api_get('square/', {
        "request_type": "get",
        "url": (booking.sourceIp.split('+')[1])? `/orders/${booking.sourceIp.split('+')[0]}` : booking.sourceIp,
        "payload": {}
        }
    ).then((response) => {
        if(response.order)
        {
            set_options(response.order.line_items)
            set_payment_ids(response.order.tenders[0].payment_id)
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
      set_totalprice(response.payment.amount_money.amount/100)
      set_totalprice_method(response.payment.source_type)
      
      
      })
}

// delete booking in zoho
function delete_booking(){
    app_api_get('zoho/', {
        "request_type": "delete",
        "url": `/salesreceipts/${booking.sourceIp.split('+')[2]}`,
        "payload":{},
    })
    .then(response => {    
    console.log(response)
    delete_booking_2()
    
    })

}
function delete_booking_2(){
    app_api_get('bookeo/', {
        "request_type": "delete",
        "url": `/bookings/${booking_id}`,
        "payload":{},
    })
    .then(response => {    
    console.log(response)
    
    })

    delete_booking_from_square()

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

    const FullPageRow = ({ text, bold, styles }) => {
        if (bold) {
            text = <b>{text}</b>;
        }
    
        return (
            <Row style={{ ...styles, margin: '0 0 0px 0' }}>
                <Col xs={12} style={{ textAlign: 'center' }}>
                    {text}
                </Col>
            </Row>
        );
    };
    const PageHeader = ({ title }) => {
        return (
            <Row style={{ margin: '10px 0 0px 0' }}>
                <Col xs={12} style={{ textAlign: 'left' }}>
                    <h6 style={{ margin: '0 0 0px 0' }}>{title}</h6>
                </Col>
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

    console.log(shift)
    
    await set_shift_fun(shift)
    await set_sub_shift_fun(sub_shift)
    set_success(true)

}

function delete_booking_from_square(){
    // retrive order to get the payment IDs
app_api_get('square/', {
    "request_type": "post",
    "url": `/refunds`,
    "payload": {
        "payment_id": payment_ids,
   
        "team_member_id": shift.team_member_id,
        "amount_money": {
            "currency": "EGP",
            "amount": total_price*100,
    } 
}}
).then(response => {
    if(response.refund.id)
        {
            // set_message("Done") 
            // set_alert(true)
            // set_success(true)

            set_deleted_from_square(true)
            
        }
    else{        set_alert(true)
        set_message(response.errors[0].detail)
    }   
    }   
)
}


function check_pass_word(){
handleToggle()
let val = document.getElementById("outlined-basic").value
console.log(val)
if(val !== shift.password)
{
    set_alert(true)
    set_message("Please enter a correct password")
}
else{
    delete_booking()
}

}
return (
    <Card className="containrt border-0 w-100 mt-5">
        
        <ResponsiveDialog alert={alert} handleCloseAlert={handleCloseAlert} message={message} />
        <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={open}
        onClick={handleClose}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
   <div className="row border-0 w-100">
   <div className='col-4 border-0'>
         { booking && <InvoicePrint shift={
                {square_receipt_number: booking.source,
                    branch_name: shift.branch_name,
                    location_name: shift.location_name,
                    city: shift.city,
                    total_price: booking.price.totalNet.amount,
                    first_paid: booking.price.totalNet.amount,
                    first_paid_method: total_price_method,
                    options: options,
                    // promocode: data.promocode
        }} note={val} set_note={set_val}/>}
     </div>
<div className='col-8 border-0 '>
        {booking && <Card>
        {/* <PageHeader title={` Customer Name ${booking.title}`} /> */}
        <h4 className="h4 margin-left"> Customer Name: {booking.title}</h4>
        <h4 className="h4 margin-left" >session: {booking.productName}  People: {booking.participants.numbers[0].number}</h4>
		<PaperRow  right={booking.productName} />
        <PaperRow  right={date} />
		<PaperRow  right={time} />
		<PaperRow right={`Account Owner `} left={get_user_and_jwt().user.username} />
		<PaperRow right='' left="" />
		{/* <PaperRow right='12315' /> */}
		<hr style={{ margin: '10px' }} />
		{ booking.source && <PaperRow right={ ` Receipt: ${booking.source}`} />}
		<hr style={{ margin: '10px' }} />
		
		{booking.options &&

		booking.options.map((res)=>(
			<PaperRow key={res.name} right={res.name} right_bold={true} left={`${res.value}  `} />
		))
		}
		
		<hr style={{ margin: '10px' }} />
		<PaperRow right='Total Price' right_bold={true} left={`  ${booking.price.totalNet.amount}`} left_bold={true} />
		
		<PaperRow right={`Total Paid: ${total_price_method == "CASH"? "Cash" : "creditcard"} `} right_bold={true} left={booking.price.totalPaid.amount} left_bold={true} />
		

		
        <Button variant="outlined" onClick={check_pass_word}>Refund This Booking</Button>
       
        <TextField id="outlined-basic" label="Password" variant="outlined" type="password"/>
           
        </Card>
        }

</div>
</div>
    </Card>
  );
}