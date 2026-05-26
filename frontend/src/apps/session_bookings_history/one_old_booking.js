import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';
import { get_user_and_jwt } from '../../components/logic/users';
import { get_shift, get_sub_shift } from '../../components/logic/shifts_functions_apis';
import { Row, Col } from 'react-bootstrap';
import { InvoicePrint } from '../../components/ui/booking_invoice';
import LoadingFun from '../../components/ui/loading';
import AlertFun from '../../components/ui/alert';
import {
  delete_booking_from_zoho, get_booking_details,
  delete_booking_from_square, update_booking_details, delete_from_inventory,
  get_session_details, get_available_sessions
} from '../../components/logic/booking_functions';
import { Typography, Autocomplete, Box, List, TextField, Paper, Divider, Grid, Chip } from '@mui/material';
import { app_put } from '../../components/logic/app';

export default function OneOldBooking() {
  const navigate = useNavigate();
  let [alertMessage, setAlertMessage] = useState();
  let { session_id, booking_id } = useParams();
  let [alert, setAlert] = useState(false);
  let [isLoading, setIsLoading] = useState(false);
  let [refundSuccess, setRefundSuccess] = useState(false);
  let [shiftDetails, setShiftDetails] = useState();
  let [subShiftDetails, setSubShiftDetails] = useState();
  const [note, setNote] = useState('');
  let [password, setPassword] = useState('');
  let [bookingDetails, setBookingDetails] = useState();
  let [availableSessions, setAvailableSessions] = useState();
  let [selectedSession, setSelectedSession] = useState();
  let [selectedDate, setSelectedDate] = useState();
  let [sessionDetails, setSessionDetails] = useState();

  useEffect(() => {
    const fetchData = async () => {
      const bookingData = await get_booking_details(booking_id);
      if (bookingData.status == 200) {
        setBookingDetails(bookingData.data);
      } else {
        setAlert(true);
        setAlertMessage(bookingData.error);
      }
      const shiftData = await get_shift();
      if (shiftData.status == 200) {
        setShiftDetails(shiftData.data);
      } else {
        setAlert(true);
        setAlertMessage(shiftData.error);
      }
      const subShiftData = await get_sub_shift();
      if (subShiftData.status == 200) {
        setSubShiftDetails(subShiftData.data);
      } else {
        setAlert(true);
        setAlertMessage(subShiftData.error);
      }
      let sessionsData = {};
      let currentSession = {};
      let date = null;
      if (session_id !== 'null') {
        const sessionData = await get_session_details(session_id);
        if (sessionData.status == 200) {
          const sessionDetails = sessionData.data;
          const dateObj = new Date(sessionDetails[0].start_time);
          const dateOnly = dateObj.toISOString().split('T')[0];
          const payload = { date: dateOnly, product: sessionDetails[0].product.id };
          sessionsData = await get_available_sessions(payload);
          currentSession = sessionDetails.find((session) => session.id == session_id);
          date = new Date(currentSession.start_time);
          setAvailableSessions(sessionsData);
          setSelectedSession(currentSession);
          setSelectedDate(date.toISOString().split('T')[0]);
          setSessionDetails(sessionData.data);
        } else {
          setAlert(true);
          setAlertMessage(sessionData.error);
        }
      }
    };
    fetchData();
  }, [booking_id, session_id]);

  useEffect(() => {
    if (refundSuccess && !alert) {
      navigate('/');
    }
  }, [refundSuccess, alert, navigate]);

  const PaperRow = ({ right, right_bold, left, left_bold }) => {
    if (right_bold) right = <b>{right}</b>;
    if (left_bold) left = <b>{left}</b>;
    return (
      <Row style={{ margin: '0 0 4px 0' }}>
        {right && <Col xs={6}><Typography variant="body2">{right}</Typography></Col>}
        {left && (
          <Col xs={6} style={{ textAlign: 'right' }}>
            <Typography variant="body2">{left}</Typography>
          </Col>
        )}
      </Row>
    );
  };

  async function on_date_change(e) {
    setSelectedDate(e.target.value);
    const sessionDetails = await get_session_details(session_id);
    const dateObj = new Date(e.target.value);
    const dateOnly = dateObj.toISOString().split('T')[0];
    const payload = { date: dateOnly, product: sessionDetails[0].product.id };
    const sessionsData = await get_available_sessions(payload);
    setAvailableSessions(sessionsData);
    setSelectedSession(sessionsData[0]);
  }

  async function delete_booking() {
    const response = await delete_booking_from_square({ bookingDetails, shiftDetails });
    if (response !== true) {
      setAlert(true);
      setAlertMessage(response?.error || response?.errors);
      return;
    }
    const zohoReceiptID = bookingDetails.zoho_sales_receipt_id;
    await delete_booking_from_zoho({ zohoReceiptID });
    const payload = {
      ...bookingDetails,
      status: 'refunded',
      booking_customer: bookingDetails.booking_customer?.id ?? bookingDetails.booking_customer,
    };
    await app_put(`booking/${bookingDetails.id}/`, {}, payload);
    await delete_from_inventory({ bookingDetails, shiftDetails, subShiftDetails });
    setRefundSuccess(true);
    setAlert(true);
    setAlertMessage('The Booking is deleted refundSuccessfully');
  }

  async function Refund(e) {
    e.preventDefault();
    setIsLoading(true);
    if (!password || password !== shiftDetails.password) {
      setIsLoading(false);
      setAlert(true);
      setAlertMessage('Please enter a correct password');
    } else {
      delete_booking();
    }
  }

  async function update_booking(e) {
    e.preventDefault();
    setIsLoading(true);
    if (!password || password !== shiftDetails.password) {
      setIsLoading(false);
      setAlert(true);
      setAlertMessage('Please enter a correct password');
    } else {
      bookingDetails.session = selectedSession.id;
      bookingDetails.customer_name = bookingDetails.customer_name;
      let new_session_id = selectedSession.id;
      const response = await update_booking_details({ bookingDetails, new_session_id });
      if (response) {
        setIsLoading(false);
        navigate('/');
      }
    }
  }

  return (
    <>
      {bookingDetails && shiftDetails && (
        <Box sx={{ maxWidth: 1100, mx: 'auto', mt: 2, mb: 5 }}>
          <AlertFun open_alert={alert} set_open_alert={setAlert} message={alertMessage} setLoading={setIsLoading} />
          <LoadingFun open={isLoading} />

          <Grid container spacing={3}>
            {/* ── Left: Invoice print ─────────────── */}
            <Grid item xs={12} md={4}>
              <InvoicePrint
                shift={{
                  square_receipt_number: bookingDetails.square_receipt_number,
                  branch_name: shiftDetails.branch_name,
                  location_name: shiftDetails.location_name,
                  city: shiftDetails.city,
                  total_price: bookingDetails?.payment?.amount,
                  first_paid: bookingDetails.payment.amount,
                  first_paid_method: bookingDetails.payment.method,
                  options: bookingDetails?.options ?? null,
                  dateTime: bookingDetails.created_at,
                  discount: bookingDetails.payment ? bookingDetails.payment.promoCode : null,
                  status: bookingDetails.status,
                  creation_agent: bookingDetails.creation_agent,
                }}
                note={note}
                set_note={setNote}
              />
            </Grid>

            {/* ── Right: Booking details + actions ── */}
            <Grid item xs={12} md={8}>
              <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid var(--gc-border2)' }}>
                {/* Header */}
                <Box
                  sx={{
                    px: 3, py: 2,
                    background: 'linear-gradient(135deg, var(--gc-bg) 0%, var(--gc-bg2) 100%)',
                    borderBottom: '1px solid var(--gc-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.main', lineHeight: 1.2 }}>
                      {bookingDetails?.customer_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {bookingDetails.type_of_players} · {bookingDetails.number_of_players} players
                    </Typography>
                  </Box>
                  {bookingDetails.status === 'refunded' && (
                    <Chip label="Refunded" color="error" />
                  )}
                </Box>

                {/* Body */}
                <Box sx={{ p: 3 }}>
                  {/* Session reassignment */}
                  {availableSessions && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.75rem', mb: 1.5 }}>
                        Reassign Session
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        <TextField
                          id="date"
                          label="Date"
                          type="date"
                          onChange={(e) => on_date_change(e)}
                          value={selectedDate}
                          size="small"
                          sx={{ width: 180 }}
                          InputLabelProps={{ shrink: true }}
                        />
                        {selectedSession && (
                          <Autocomplete
                            disablePortal
                            freeSolo
                            id="sessions"
                            options={availableSessions?.map((session) => {
                              const dt = new Date(session.start_time);
                              return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
                            })}
                            sx={{ flex: 1, minWidth: 200 }}
                            value={
                              selectedSession?.start_time
                                ? `${new Date(selectedSession.start_time).getFullYear()}-${String(new Date(selectedSession.start_time).getMonth() + 1).padStart(2, '0')}-${String(new Date(selectedSession.start_time).getDate()).padStart(2, '0')} ${String(new Date(selectedSession.start_time).getHours()).padStart(2, '0')}:${String(new Date(selectedSession.start_time).getMinutes()).padStart(2, '0')}`
                                : ''
                            }
                            onInputChange={(event, newValue) => {
                              const session = availableSessions.find((session) => {
                                const dt = new Date(session.start_time);
                                const formatted = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
                                return formatted === newValue;
                              });
                              if (session) setSelectedSession(session);
                            }}
                            renderInput={(params) => <TextField {...params} label="Session Time" size="small" />}
                          />
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Booking info */}
                  <Box sx={{ mb: 3 }}>
                    <PaperRow right={bookingDetails.type_of_players} />
                    <PaperRow right="Account Owner" left={bookingDetails.creation_agent} />
                    <PaperRow right={`Receipt: ${bookingDetails.square_receipt_number}`} />
                    {bookingDetails.note && <PaperRow right={`Note: ${bookingDetails.note}`} />}
                  </Box>

                  {/* Line items */}
                  {bookingDetails.options && bookingDetails.options.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Divider sx={{ mb: 1.5 }} />
                      {bookingDetails.options.map((res) =>
                        Number(res.quantity) > 0 ? (
                          <PaperRow
                            key={res.uid}
                            right={res.name}
                            left={`${res.quantity} × ${res.total_money.amount / (100 * res.quantity)}`}
                          />
                        ) : null
                      )}
                      <Divider sx={{ mt: 1.5, mb: 1.5 }} />
                    </Box>
                  )}

                  {/* Total */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      border: '1px solid var(--gc-border)',
                      mb: 3,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      Total Price · {bookingDetails?.payment.method}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                      {bookingDetails?.payment.amount} EGP
                    </Typography>
                  </Box>

                  {/* Password + actions */}
                  <Box component="form">
                    <TextField
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      fullWidth
                      size="medium"
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button variant="contained" onClick={(e) => update_booking(e)} fullWidth>
                        Update Booking
                      </Button>
                      <Button variant="outlined" color="error" onClick={(e) => Refund(e)} fullWidth>
                        Refund Booking
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </>
  );
}
