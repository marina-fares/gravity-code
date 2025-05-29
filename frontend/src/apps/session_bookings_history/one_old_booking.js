import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import Card from 'react-bootstrap/Card';
import { useNavigate } from 'react-router-dom';
import { get_user_and_jwt } from '../../components/logic/users';
import { get_shift, get_sub_shift } from '../../components/logic/shifts_functions_apis';
import { Row, Col } from 'react-bootstrap';
import { InvoicePrint } from '../../components/ui/booking_invoice'
import LoadingFun from '../../components/ui/loading'
import AlertFun from '../../components/ui/alert';
import { List, TextField} from '@mui/material';
import { 
    delete_booking_from_zoho, get_booking_details, 
    delete_booking_from_square, update_booking_details, delete_from_inventory, 
} from '../../components/logic/booking_functions';
import {Box} from '@mui/material';
import { Typography } from '@mui/material';

export default function OneOldBooking() {
    const navigate = useNavigate();
    let [ bookingDate, setBookingDate ] = useState()
    let [ bookingTime, setBookingTime ] = useState()
    let [ alertMessage, setAlertMessage ] = useState()
    let { session_id, booking_id } = useParams();
    let [ alert, setAlert ] = useState(false)
    let [ isLoading, setIsLoading ] = useState(false)
    let [ refundSuccess, setRefundSuccess ] = useState(false)
    let [ shiftDetails, setShiftDetails ] = useState()
    let [ subShiftDetails, setSubShiftDetails ] = useState()
    const [ note, setNote ] = useState('')
    let [ password, setPassword ] = useState('');
    let [ bookingDetails, setBookingDetails ] = useState();


    

    useEffect(() => {
        const fetchData = async () => {
            const bookingData = await get_booking_details(booking_id);
            setBookingDetails(bookingData)
            var date = new Date(bookingData.created_at);
            var date2 = date.getDate()+'/' + (date.getMonth()+1) + '/' + date.getFullYear();
            setBookingDate (date2)

            var time = (date.getHours() % 12 || 12) + ':' + date.getMinutes() +' ' + ((date.getHours()>= 12)? 'PM' : 'AM')
            setBookingTime(time)
            
            const shiftData = await get_shift()
            setShiftDetails(shiftData)

            const subShiftData = await get_sub_shift()
            setSubShiftDetails(subShiftData)
            
        };
        fetchData()
    }, [booking_id])

    useEffect(()=>{
        if(refundSuccess && !alert)
        {
            navigate('/')
        }
    },[refundSuccess, alert, navigate])




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




    async function delete_booking(){
        const response = await delete_booking_from_square({bookingDetails, shiftDetails})
        if(response !== true){
            setAlert(true)
            setAlertMessage(response?.error || response?.errors)
            return ;
        }

        const zohoReceiptID = bookingDetails.zoho_sales_receipt_id
        await delete_booking_from_zoho({zohoReceiptID})

        const newState = 'refunded'
        await update_booking_details({bookingDetails, newState, session_id})

        await delete_from_inventory({bookingDetails, shiftDetails, subShiftDetails})
        setRefundSuccess(true) 
        setAlert(true)
        setAlertMessage("The Booking is deleted refundSuccessfully") 
    }


    async function Refund(e){
        e.preventDefault()
            setIsLoading(true);
        if (!password || password !== shiftDetails.password) {
            setIsLoading(false);
            setAlert(true);
            setAlertMessage("Please enter a correct password");
        } else {
            delete_booking();
        }
    }



return (
    <>
    { bookingDetails && shiftDetails &&
    <Card className="containrt border-0 w-100 mt-5 mb-5">
        <AlertFun open_alert={alert} set_open_alert={setAlert} message={alertMessage} setLoading={setIsLoading}/>
        <LoadingFun open={isLoading} />
        <div className="row border-0 w-100">
            <div className='col-4 border-0'>
                <InvoicePrint shift={
                        {square_receipt_number: bookingDetails.square_receipt_number,
                            branch_name: shiftDetails.branch_name,
                            location_name: shiftDetails.location_name,
                            city: shiftDetails.city,
                            total_price: bookingDetails.payment.amount,
                            first_paid: bookingDetails.payment.amount,
                            first_paid_method: bookingDetails.payment.method,
                            options: bookingDetails?.options?? null,
                            dateTime: bookingDetails.created_at,
                            discount: (bookingDetails.payment)?bookingDetails.payment.promoCode:null
                            // promocode: data.promocode
                }} note={note} set_note={setNote}/>
            </div>
            <div className='col-8 border-0 '>
                {bookingDetails && <Card>
                    <h4 className="h4 margin-left"> Customer Name: {bookingDetails.customer}</h4>
                    <h4 className="h4 margin-left" >session: {bookingDetails.type_of_players}  -  People: {bookingDetails.number_of_players}</h4>
                    <PaperRow  right={bookingDetails.type_of_players} />
                    <PaperRow  right={bookingDate} />
                    <PaperRow  right={bookingTime} />
                    <PaperRow right={`Account Owner `} left={get_user_and_jwt().user.username} />
                    <PaperRow right='' left="" />
                    <hr style={{ margin: '10px' }} />
                    <PaperRow right={ ` Receipt: ${bookingDetails.square_receipt_number}`} />
                    <hr style={{ margin: '10px' }} />
                    <List
                    sx={{ width: '75%', bgcolor: 'background.paper', mx: 'auto',}}
                    className='flex-column d-flex justify-content-center'
                    >
                        {bookingDetails.options && (bookingDetails.options).length > 0 &&
                            (bookingDetails.options).map((res)=>
                            {   
                                return (Number(res.quantity) > 0 &&
                                <PaperRow key={res.uid} right={res.name} left={res.quantity} />
                            )})

                        }
                    </List>

                
                    <hr style={{ margin: '10px' }} />
                    {/* <PaperRow key={res.uid} right="Total Price" left={res.quantity} /> */}
                    <Box 
                    display="flex" 
                    justifyContent="space-between" 
                    alignItems="center" 
                    width="100%"
                    className="pl-5 justify-content-center"
                    >
                    <Typography className="w-50" variant="body1" fontWeight="bold">Total Price</Typography>
                    <Typography className="w-50" variant="body1" fontWeight="bold">
                        {bookingDetails?.payment.amount} EGP
                    </Typography>
                    <Typography className="w-50" variant="body1" fontWeight="bold">
                        {bookingDetails?.payment.method}
                    </Typography>
                    </Box>                    


                

                    <form onSubmit={(e)=>Refund(e)}>
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
                        <div className='flex-row d-flex justify-content-center'>
                            <Button  type="submit" variant="outlined" color="primary" fullWidth>
                                Refund Booking
                            </Button>

                        </div>

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