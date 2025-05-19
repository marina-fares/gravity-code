import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { app_api_get } from '../../components/logic/apis';
import { TextField } from '@mui/material';
import Button from '@mui/material/Button';
import Card from 'react-bootstrap/Card';
import { useNavigate } from 'react-router-dom';
import { get_user_and_jwt } from '../../components/logic/users';
import { get_shift, set_shift_fun, get_sub_shift, set_sub_shift_fun } from '../start_shift/shifts_functions';
import { Row, Col } from 'react-bootstrap';
import { InvoicePrint } from '../../components/ui/booking_invoice'
import LoadingFun from '../../components/ui/loading'
import AlertFun from '../../components/ui/alert';


export default function MyApp() {
    const navigate = useNavigate();
    let [bookeoBooking, setBookeoBooking] = useState()
    let [date, set_date] = useState()
    let [time, set_time] = useState()
    let [message, set_message] = useState()
    let { booking_id } = useParams();
    let [alert, set_alert] = useState(false)
    let [success, set_success] = useState(false)
    let [deleted_from_square, set_deleted_from_square] = useState(false)
    let [shift, set_shift] = useState()
    let [sub_shift, set_sub_shift] = useState()
    let [payment_ids, set_payment_ids] = useState()
    const [val, set_val] = useState()
    const [open, setOpen] = useState(false);
    let [password, setPassword] = useState();
    let [payment, setPayment] = useState();
    let [booking, setBooking] = useState();
    

    useEffect(() => {
        get_booking_from_bookeo()
        get_shift().then((data) => {
            set_shift(data);
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
            setOpen(false)
            set_alert(true)
            set_message("The Booking is deleted successfully") 
        }
    },[success])

    useEffect(()=>{
        if(!alert && success)
        {
            navigate('/')
        }
    }, [alert, navigate, success])

    useEffect(()=>{
        if(bookeoBooking){
            get_order_from_square()
        }
    },[bookeoBooking])


    useEffect(()=>{
        if(payment_ids){
            get_payment_from_square()
        }
    },[payment_ids])


    function get_booking_from_bookeo(){
        app_api_get('bookeo/', {
            "request_type": "get",
            "url": `/bookings/${booking_id}`,
            "payload": { },
            }).then((response) => { 
            if(response.canceled)
            {
                set_alert(true)
                set_message("The booking has been successfully refunded.")
            }
            else{
                //set_booking(response)
                setBookeoBooking(response)
            }
            
            var date = new Date(response.creationTime);
            var date2 = date.getDate()+'/' + (date.getMonth()+1) + '/' + date.getFullYear();
            set_date (date2)

            var time = (date.getHours() % 12 || 12) + ':' + date.getMinutes() +' ' + ((date.getHours()>= 12)? 'PM' : 'AM')
            set_time(time)
        })
    }

    function get_order_from_square(){
        app_api_get('square/', {
            "request_type": "get",
            "url": (bookeoBooking.sourceIp.split('+')[1])? `/orders/${bookeoBooking.sourceIp.split('+')[0]}` : bookeoBooking.sourceIp,
            "payload": {}
            }
        ).then((response) => {
            if(response.order)
            {
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
            "url": `/payments/${payment_ids}`,
            "payload":{},
        })
        .then(response => {    
            if(response){
            setPayment(response.payment)
        }
        })
    }

    async function delete_booking(){
        await app_api_get('zoho/', {
            "request_type": "delete",
            "url": `/salesreceipts/${bookeoBooking.sourceIp.split('+')[2]}`,
            "payload":{},
        })
        delete_booking_from_bookeo()
    }
    async function delete_booking_from_bookeo(){
        await app_api_get('bookeo/', {
            "request_type": "delete",
            "url": `/bookings/${booking_id}`,
            "payload":{},
        })

        delete_booking_from_square()
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
        shift.inventory[booking.line_items[item].name].refund += parseInt(booking.line_items[item].quantity)
    }

    if(payment.source_type === "CASH")
    {
        shift.refund_cash += payment.amount_money.amount/100
        sub_shift.refund_cash += payment.amount_money.amount/100
    }
    else{
        shift.refund_visa += payment.amount_money.amount/100
        sub_shift.refund_visa += payment.amount_money.amount/100
    }

    
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
                "amount": payment.amount_money.amount,
        } 
    }}
    ).then(response => {
        if(response.refund.id)
            {
                set_deleted_from_square(true)   
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
        if (!password || password !== shift.password) {
            setOpen(false);
            set_alert(true);
            set_message("Please enter a correct password");
        } else {
            delete_booking();
        }
    };



return (
    <>
    { booking && payment && bookeoBooking &&
    <Card className="containrt border-0 w-100 mt-5">
        <AlertFun open_alert={alert} set_open_alert={set_alert} message={message} />
        <LoadingFun open={open} />
        <div className="row border-0 w-100">
            <div className='col-4 border-0'>
                { booking && <InvoicePrint shift={
                        {square_receipt_number: payment.receipt_number,
                            branch_name: shift.branch_name,
                            location_name: shift.location_name,
                            city: shift.city,
                            total_price: payment.amount_money.amount/100,
                            first_paid: payment.amount_money.amount/100,
                            first_paid_method: payment.source_type,
                            options: booking.line_items,
                            dateTime: booking.created_at,
                            discount: (booking.discounts)?booking.discounts[0].percentage:null
                            // promocode: data.promocode
                }} note={val} set_note={set_val}/>}
            </div>
            <div className='col-8 border-0 '>
                {booking && <Card>
                    <h4 className="h4 margin-left"> Customer Name: {bookeoBooking.title}</h4>
                    <h4 className="h4 margin-left" >session: {bookeoBooking.productName}  -  People: {bookeoBooking.participants.numbers[0].number}</h4>
                    <PaperRow  right={bookeoBooking.productName} />
                    <PaperRow  right={date} />
                    <PaperRow  right={time} />
                    <PaperRow right={`Account Owner `} left={get_user_and_jwt().user.username} />
                    <PaperRow right='' left="" />
                    <hr style={{ margin: '10px' }} />
                    <PaperRow right={ ` Receipt: ${payment.receipt_number}`} />
                    <hr style={{ margin: '10px' }} />
                
                    {booking.line_items &&
                    booking.line_items.map((res)=>
                    {   
                        return (Number(res.quantity) > 0 &&
                    <PaperRow key={res.name} right={res.name} right_bold={true} left={`${res.quantity} * ${res.base_price_money.amount/100}`} />
                    )})

                    }
                
                    <hr style={{ margin: '10px' }} />
                    <PaperRow right='Total Price' right_bold={true} left={`  ${payment.amount_money.amount/100}`} left_bold={true} />
                    
                    <PaperRow right={`Total Paid: ${payment.source_type === "CASH"? "Cash" : "creditcard"} `} right_bold={true} left={payment.amount_money.amount/100} left_bold={true} />
                

                

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
                }

            </div>
        </div>
            
    </Card>
    }
    </>
  );
}