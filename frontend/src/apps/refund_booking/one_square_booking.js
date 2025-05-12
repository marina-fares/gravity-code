
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { app_api_get } from '../../components/logic/apis';
import {  TextField } from '@mui/material';
import Button from '@mui/material/Button';
import Card from 'react-bootstrap/Card';
import { useNavigate } from 'react-router-dom';
import { get_user_and_jwt } from '../../components/logic/users';
import { get_shift, get_sub_shift, set_shift, set_sub_shift } from '../../components/logic/shifts_functions_apis';
import { Row, Col } from 'react-bootstrap';
import LoadingFun from '../../components/ui/loading'
import AlertFun from '../../components/ui/alert';
import { InvoicePrint } from '../../components/ui/booking_invoice';


export default function SquareBook() {
    const navigate = useNavigate();

    let [date, set_date] = useState()
    let [time, set_time] = useState()
    let { square_order_id } = useParams();
    let [shiftDetails, setShiftDetails] = useState()
    let [subShiftDetails, setSubShiftDetails] = useState()
    let [payment_ids, set_payment_ids] = useState()
    let [open, setOpen] = useState(false)
    let [alert, set_alert] = useState(false)
    let [message, set_message] = useState()
    let [password, setPassword] = useState();
    let [booking, setBooking] = useState();
    let [payment, setPayment] = useState();
    let [deleted_from_square, set_deleted_from_square] = useState(false)
    let [success, set_success] = useState(false)


    useEffect(() => {
        get_order_from_square()
        get_shift().then((data) => {
            setShiftDetails(data);
        });

        get_sub_shift().then((data) => {
            setSubShiftDetails(data);
        });
    }, [])

    useEffect(()=>{
        if((booking)?.tenders[0].payment_id){
            get_payment_from_square()
        }
    },[payment_ids])

    useEffect(()=>{
    if(success)
    {
        setOpen(false)
        set_alert(true)
        set_message("The booking has been successfully refunded.")
    }
    }, [success])

    useEffect(() => {
        if(!alert && success)
        {
            navigate('/')
        }
    },[alert])

    useEffect(()=>{
    if(deleted_from_square)
    {
        update_inventory()
    }
    }, [deleted_from_square])




function get_order_from_square(){
    app_api_get('square/', {
        "request_type": "get",
        "url": `/orders/${square_order_id}`,
        "payload": {}
        }
    ).then((response) => {
        if(response.order)
        {
            let date = new Date(response.order.created_at)
            let date2 = date.getDate()+'/' + (date.getMonth()+1) + '/' + date.getFullYear();
            set_date(date2)
            let time = (date.getHours() % 12 || 12) + ':' + date.getMinutes() +' ' + ((date.getHours()>= 12)? 'PM' : 'AM')
            set_time(time)

            set_payment_ids(response.order.tenders[0].payment_id)
            setBooking(response.order)
            
            
        }
        else{
            set_alert(true)
            set_message(response.errors[0].detail)
        }
    })
}


function get_payment_from_square(){
app_api_get('square/', {
    "request_type": "get",
    "url": `/payments/${booking.tenders[0].payment_id}`,
    "payload":{},
    })
    .then(response => {    
        if(response.payment)
        {
            let zoho_id = response.payment.note.split('+')[1].split(' ')[2]
            setPayment(response.payment)
        }

    })
}




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

    for(let item in booking.line_items)
    {
        shiftDetails.inventory[booking.line_items[item].name].refund += parseInt(booking.line_items[item].quantity)
    }


    if(payment.source_type === "CASH")
        {
            shiftDetails.refund_cash += payment.amount_money.amount/100
            subShiftDetails.refund_cash += payment.amount_money.amount/100
        }
        else{
            shiftDetails.refund_visa += payment.amount_money.amount/100
            subShiftDetails.refund_visa += payment.amount_money.amount/100
        }


    let options_new = []
    for(let i in shiftDetails.options2)
    {

        if(Object.keys(shiftDetails.options2[i])[0] !== payment.receipt_number )
        {
            options_new.push(shiftDetails.options2[i])
        }
    }
    shiftDetails.options2 = options_new
    
    await set_shift(shiftDetails)
    await set_sub_shift(subShiftDetails)
    set_success(true)

}

function delete_booking_from_zoho(){
    if(payment.note.split('+')[1].split(' ')[2])
    {
        app_api_get('zoho/', {
            "request_type": "delete",
            "url": `/salesreceipts/${payment.note.split('+')[1].split(' ')[2]}`,
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
        "payment_id": booking.tenders[0].payment_id,
        "amount_money": {
            "currency": "EGP",
            "amount": payment.amount_money.amount,
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



const check_pass_word = (e) => {
        e.preventDefault();
        setOpen(true);
        if (!password || password !== shiftDetails.password) {
            setOpen(false);
            set_alert(true);
            set_message("Please enter a correct password");
        } else {
            delete_booking_from_zoho();
        }
    };
return (
    <> { booking && payment && 
        <Card className="containrt border-0 w-100 mt-5">
        
        <AlertFun open_alert={alert} set_open_alert={set_alert} message={message} />
        <LoadingFun open={open}/>
        <div className="row border-0 w-100">
            <div className='col-4 border-0'>
                { booking && payment && <InvoicePrint shift={
                    {square_receipt_number: payment.receipt_number,
                        branch_name: shiftDetails.branch_name,
                        location_name: shiftDetails.location_name,
                        city: shiftDetails.city,
                        total_price: payment.amount_money.amount/100,
                        first_paid: payment.amount_money.amount/100,
                        first_paid_method: payment.source_type,
                        options: booking.line_items,
                        dateTime: booking.created_at,        
                    }}/> }
            </div>
            <div className='col-8 border-0 '>
            <Card >
                <PaperRow  right={date} />
                <PaperRow  right={time} />
                <PaperRow right={`Account Owner `} left={get_user_and_jwt().user.username} />
                <PaperRow right='' left="" />
                <hr style={{ margin: '10px' }} />
                <PaperRow right={ ` Receipt: ${payment.receipt_number}`} />
                <hr style={{ margin: '10px' }} />
                
                {booking.line_items &&

                booking.line_items.map((res)=>(
                    <PaperRow key={res.name} right={res.name} right_bold={true} left={`${res.quantity} * ${res.base_price_money.amount/100}`} />
                ))
                }
                
                <hr style={{ margin: '10px' }} />
                <PaperRow right='Total Price' right_bold={true} left={`  ${payment.amount_money.amount/100}`} left_bold={true} />
                
                <PaperRow right={`Total Paid: ${payment.source_type == "CASH"? "Cash" : "creditcard"} `} right_bold={true} left={payment.amount_money.amount/100} left_bold={true} />
            

            
                <form onSubmit={check_pass_word}>
                    <TextField
                        id="outlined-basic"
                        label="Password"
                        variant="outlined"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                    <Button type="submit" variant="outlined" color="primary" fullWidth>
                        Refund This Booking
                    </Button>
                </form>
            </Card>  
        </div> 
        </div>
    </Card>}
    </>
  );
}