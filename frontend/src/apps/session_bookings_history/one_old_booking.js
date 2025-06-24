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
import { 
    delete_booking_from_zoho, get_booking_details, 
    delete_booking_from_square, update_booking_details, delete_from_inventory, 
    get_session_details, get_available_sessions
} from '../../components/logic/booking_functions';
import { Typography, Autocomplete, Box, List, TextField } from '@mui/material';
import { app_put } from '../../components/logic/app';

export default function OneOldBooking() {
    const navigate = useNavigate();
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
    let [ availableSessions, setAvailableSessions ] = useState();
    let [ selectedSession, setSelectedSession ] = useState();
    let [ selectedDate, setSelectedDate ] = useState()


    

    useEffect(() => {
        const fetchData = async () => {
            const bookingData = await get_booking_details(booking_id);
            setBookingDetails(bookingData)
            
            const shiftData = await get_shift()
            setShiftDetails(shiftData)

            const subShiftData = await get_sub_shift()
            setSubShiftDetails(subShiftData)

            let sessionsData = {}
            let currentSession = {}
            let date = null
            if (session_id !== 'null' ) {
                console.log("session_id", session_id)
                console.log("session_id", typeof(session_id))
                const sessionDetails = await get_session_details(session_id)
                const dateObj = new Date(sessionDetails[0].start_time);
                const dateOnly = dateObj.toISOString().split('T')[0];
                const payload = { "date": dateOnly , "product" : sessionDetails[0].product.id}
                sessionsData = await get_available_sessions(payload);
                console.log("-------------------",sessionsData )
                currentSession = sessionDetails.find((session)=> session.id == session_id)
                date = new Date(currentSession.start_time)    
                setAvailableSessions(sessionsData)
                setSelectedSession(currentSession)
                setSelectedDate(date.toISOString().split('T')[0])   
            }
            


        };
        fetchData()
    }, [booking_id, session_id])

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


    async function on_date_change(e){
        setSelectedDate(e.target.value)
        const sessionDetails = await get_session_details(session_id)
        const dateObj = new Date(e.target.value);
        const dateOnly = dateObj.toISOString().split('T')[0];
        const payload = { "date": dateOnly , "product" : sessionDetails[0].product.id}
        const sessionsData = await get_available_sessions(payload);
        setAvailableSessions(sessionsData)
        setSelectedSession(sessionsData[0])
    }

    async function delete_booking(){
        const response = await delete_booking_from_square({bookingDetails, shiftDetails})
        if(response !== true){
            setAlert(true)
            setAlertMessage(response?.error || response?.errors)
            return ;
        }

        const zohoReceiptID = bookingDetails.zoho_sales_receipt_id
        await delete_booking_from_zoho({zohoReceiptID})

        // const newState = 'refunded'
        bookingDetails.status = 'refunded'
        await app_put(`booking/${bookingDetails.id}/`,{}, bookingDetails)

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

    async function update_booking(e){
            e.preventDefault()
            setIsLoading(true);
        if (!password || password !== shiftDetails.password) {
            setIsLoading(false);
            setAlert(true);
            setAlertMessage("Please enter a correct password");
        } else {
            bookingDetails.session = selectedSession.id
            bookingDetails.booking_customer = bookingDetails.booking_customer.id
            let new_session_id = selectedSession.id
            const response = await update_booking_details({bookingDetails, new_session_id})
            if (response){
                setIsLoading(false);
                navigate('/')
            }
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
                    <h4 className="h4 margin-left"> Customer Name: {bookingDetails?.booking_customer?.identifier}</h4>
                    <h4 className="h4 margin-left" >session: {bookingDetails.type_of_players}  -  People: {bookingDetails.number_of_players}</h4>
                    {availableSessions &&
                    <div className='row'>
                    { availableSessions && <div><TextField
                        id='date'
                        label='Selected Date'
                        type='date'
                        onChange={(e) => {
                            on_date_change(e)
                        }}
                        value={selectedDate}
                        sx={{ width: 220 }}
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />
{selectedSession && (
  <Autocomplete
    disablePortal
    freeSolo
    id="sessions"
    options={availableSessions?.map((session) => {
      const datetime = new Date(session.start_time);
      return `${datetime.getFullYear()}-${String(datetime.getMonth() + 1).padStart(2, '0')}-${String(datetime.getDate()).padStart(2, '0')} ${String(datetime.getUTCHours()).padStart(2, '0')}:${String(datetime.getUTCMinutes()).padStart(2, '0')}`;
    })}
    className="border-0 w-100 p-2"
    sx={{ width: '100%' }}
    value={
      selectedSession?.start_time
        ? `${new Date(selectedSession.start_time).getFullYear()}-${String(new Date(selectedSession.start_time).getMonth() + 1).padStart(2, '0')}-${String(new Date(selectedSession.start_time).getDate()).padStart(2, '0')} ${String(new Date(selectedSession.start_time).getUTCHours()).padStart(2, '0')}:${String(new Date(selectedSession.start_time).getUTCMinutes()).padStart(2, '0')}`
        : ''
    }
    onInputChange={(event, newValue) => {
      const session = availableSessions.find((session) => {
        const datetime = new Date(session.start_time);
        const formatted = `${datetime.getFullYear()}-${String(datetime.getMonth() + 1).padStart(2, '0')}-${String(datetime.getDate()).padStart(2, '0')} ${String(datetime.getUTCHours()).padStart(2, '0')}:${String(datetime.getUTCMinutes()).padStart(2, '0')}`;
        return formatted === newValue;
      });

      if (session) {
        setSelectedSession(session);
      }
    }}
    renderInput={(params) => <TextField {...params} label="Booking Session" />}
  />
)}

                    </div>}
                    </div>
                    }
                    <PaperRow  right={bookingDetails.type_of_players} />
                    {/* <PaperRow  right={bookingDate} />
                    <PaperRow  right={bookingTime} /> */}
                    <PaperRow right={`Account Owner `} left={get_user_and_jwt().user.username} />
                    <PaperRow right='' left="" />
                    <hr style={{ margin: '10px' }} />
                    <PaperRow right={ ` Receipt: ${bookingDetails.square_receipt_number}`} />
                    {bookingDetails.note && <PaperRow right={ ` Note: ${bookingDetails.note}`} />}
                    <hr style={{ margin: '10px' }} />
                    <List
                    sx={{ width: '75%', bgcolor: 'background.paper', mx: 'auto',}}
                    className='flex-column d-flex justify-content-center'
                    >
                        {bookingDetails.options && (bookingDetails.options).length > 0 &&
                            (bookingDetails.options).map((res)=>
                            {   
                                return (Number(res.quantity) > 0 &&
                                <PaperRow key={res.uid} right={res.name} left={`${res.quantity} * ${res.total_money.amount/(100*res.quantity)}`} />
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


                

                    <form >
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
                            <Button  onClick={(e)=>update_booking(e)} variant="outlined" color="primary" fullWidth>
                                Update Booking
                            </Button>
                            <Button  onClick={(e)=>Refund(e)} type="submit" variant="outlined" color="primary" fullWidth>
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