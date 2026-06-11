import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { get_localstorage, set_localstorage } from '../../components/logic/localstorage';
import {
  Grid, TextField, Button, Input, FormControl, RadioGroup,
  FormControlLabel, Radio, Checkbox, Typography, Box, Paper, Divider, Chip,
  IconButton, InputBase
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import Autocomplete from '@mui/material/Autocomplete';
import { get_shift, get_sub_shift } from '../../components/logic/shifts_functions_apis';
import LoadingFun from '../../components/ui/loading';
import AlertFun from '../../components/ui/alert';
import {
  get_promo_codes, get_session_details, delete_booking_on_error,
  get_all_customers, isRealCustomerName
} from './functions_apis';
import {
  get_total_price, create_payment_api, create_sales_receipt, add_to_inventory,
  create_hold_booking, create_booking, delete_hold_booking, create_customer
} from '../../components/logic/booking_functions';
import { InvoicePrint } from '../../components/ui/booking_invoice';

export default function Booking() {
  let date = new Date();
  let { session_id } = useParams();
  let [sessionsDetails, setSessionsDetails] = useState([]);
  let [isLoading, setIsLoading] = useState(false);
  let [selectedOptions, setSelectedOptions] = useState({});
  let [note, setNote] = useState();
  let [allPromoCodes, setAllPromoCodes] = useState([]);
  let [promoCode, setSelectedPromoCode] = useState();
  let [paid, setPaid] = useState(0);
  let [paymentMethod, setPaymentMethod] = useState('cash');
  let [alert, setAlert] = useState(false);
  let [alertMessage, setAlertMessage] = useState();
  let [shiftDetails, setShiftDetails] = useState();
  let [allSquareItems] = useState(JSON.parse(get_localstorage('squareItems')));
  let [allZohoItems] = useState(JSON.parse(get_localstorage('zohoItems')));
  let [selectedSquareItems, setSelectedSquareItems] = useState([]);
  let [selectedZohoItems, setSelectedZohoItems] = useState([]);
  let [bookingSuccess, setBookingSuccess] = useState(false);
  let [promotrue, set_promotrue] = useState(false);
  let [selectedCategory, setSelectedCategory] = useState();
  let [numberOfPlayers, setNumberOfPlayers] = useState(1);
  const [subShiftDetails, setSubShiftDetails] = useState();
  let [allCustomers, setAllCustomers] = useState();
  let [customerName, setCustomerName] = useState(
    date.getFullYear() +
      '/' +
      (Number(date.getMonth()) + 1) +
      '/' +
      date.getDate() +
      ' ' +
      date.getHours() +
      ':' +
      date.getMinutes() +
      ':' +
      date.getSeconds()
  );
  let [orderDetails, setOrderDetails] = useState();
  let [paymentDetails, setPaymentDetails] = useState();
  let [bookingDetails, setBookingDetails] = useState();
  let [salesReceiptDetails, setSalesReceiptDetails] = useState();
  let [customItem, setCustomItem] = useState({
    name: 'Custom Item',
    quantity: '1',
    base_price_money: { amount: 0, currency: 'EGP' },
  });

  // ── Data fetching ─────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      const shiftData = await get_shift();
      if (shiftData.status === 200) {
        setShiftDetails(shiftData.data);
      } else {
        setAlert(true);
        setAlertMessage(shiftData?.error, shiftData?.detail);
      }
      const subShiftData = await get_sub_shift();
      if (subShiftData.status === 200) {
        setSubShiftDetails(subShiftData.data);
      } else {
        setAlert(true);
        setAlertMessage(subShiftData?.error, shiftData?.detail);
      }
      const promoCodesData = await get_promo_codes();
      if (promoCodesData.status === 200) {
        setAllPromoCodes(promoCodesData.data);
      } else {
        setAlert(true);
        setAlertMessage(promoCodesData.error, promoCodesData?.detail);
      }
      const sessionData = await get_session_details(session_id);
      console.log('sessionData', sessionData);
      if (sessionData.status === 200) {
        setSessionsDetails(sessionData.data);
      } else {
        setAlert(true);
        setAlertMessage(sessionData?.error, sessionData?.detail);
      }
      setSelectedCategory(`1HR ${sessionData.data[0].product.nick_name}`);
      const customersData = await get_all_customers();
      console.log('customersData', customersData);
      setAllCustomers(customersData.data || []);
    };
    fetchData();
  }, [session_id]);

  useEffect(() => {
    if (numberOfPlayers && selectedCategory && allZohoItems && customItem) {
      set_options_for_apis();
    }
  }, [selectedOptions, numberOfPlayers, selectedCategory, promotrue, promoCode, allZohoItems, customItem]);

  useEffect(() => {
    if (orderDetails) {
      setPaid(orderDetails?.total_money?.amount / 100 ?? 0);
    }
  }, [orderDetails]);

  useEffect(() => {
    const handleBooking = async () => {
      if (bookingDetails?.type_of_players && !bookingSuccess) {
        let result = await null;
        const times = promoCode?.duration || 1;
        for (let i = 0; i < times; i++) {
          let round = i;
          result = await create_booking({ sessionsDetails, bookingDetails, round });
        }
        if (result.error) {
          let paymentData = paymentDetails;
          let zohoReceiptID = salesReceiptDetails?.id;
          delete_booking_error({ paymentData, zohoReceiptID });
          setAlert(true);
          setAlertMessage(result?.error, result?.detail);
        } else {
          setBookingSuccess(true);
        }
      }
    };
    handleBooking();
  }, [bookingDetails, sessionsDetails, promoCode, paymentDetails, salesReceiptDetails]);

  useEffect(() => {
    if (bookingSuccess && paymentDetails) {
      setIsLoading(false);
    }
  }, [bookingSuccess, paymentDetails]);

  // ── Business logic functions ──────────────────────────────
  function set_selected_options(e) {
    setSelectedOptions((selectedOptions) => ({
      ...selectedOptions,
      [e.target.name]: e.target.value.length === 0 ? 0 : e.target.value,
    }));
  }

  function handle_addon_change(key, delta) {
    setSelectedOptions((prev) => {
      const current = Number(prev[key] || 0);
      const next = Math.max(0, Math.min(sessionsDetails[0].available_seats, current + delta));
      return { ...prev, [key]: String(next) };
    });
  }

  function set_options_for_apis() {
    let zohoItemsList = [];
    let squareIdsList = [];
    if (customItem.base_price_money.amount > 0 && customItem.name !== '') {
      squareIdsList.push(customItem);
      zohoItemsList.push({ name: customItem.name, quantity: 1, rate: customItem.base_price_money.amount / 1.14, tax_id: '5118629000000088105' });
    }
    const baseRate = allZohoItems[selectedCategory][1];
    const discountedRate =
      promoCode && promoCode.duration === 1 && promoCode.square_pre > 0
        ? baseRate - (baseRate * Number(promoCode.percentage)) / 100
        : baseRate;
    if (discountedRate > 0) {
      zohoItemsList.push({ item_id: allZohoItems[selectedCategory][0], quantity: numberOfPlayers, rate: discountedRate, tax_id: '5118629000000088105' });
    }
    for (const [key, value] of Object.entries(selectedOptions)) {
      if (value != '0') {
        const baseRate = allZohoItems[key][1];
        const discountedRate =
          promoCode && !promotrue && promoCode.square_pre > 0
            ? baseRate - (baseRate * Number(promoCode.percentage)) / 100
            : baseRate;
        if (discountedRate > 0) {
          zohoItemsList.push({ quantity: value.toString(), item_id: allZohoItems[key][0], rate: discountedRate, tax_id: '5118629000000088105' });
        }
      }
    }
    const baseSquareOption = {
      quantity: String(numberOfPlayers),
      catalog_object_id: allSquareItems[sessionsDetails[0].product.nick_name][selectedCategory],
    };
    if (promoCode && promotrue) {
      baseSquareOption.applied_discounts = [0];
    }
    squareIdsList.push(baseSquareOption);
    for (const [key, value] of Object.entries(selectedOptions)) {
      if (value !== '0') {
        squareIdsList.push({
          quantity: value.toString(),
          catalog_object_id: allSquareItems['Add On'][key] || allSquareItems[sessionsDetails[0].product.nick_name + '+'][key],
        });
      }
    }
    setSelectedZohoItems(zohoItemsList);
    setSelectedSquareItems(squareIdsList);
  }

  async function hold_booking() {
    setIsLoading(true);
    let result = await get_total_price({ shiftDetails, promoCode, selectedSquareItems });
    if (result.error) {
      setAlert(true);
      setAlertMessage(result?.error, result?.detail);
      return;
    } else {
      setOrderDetails(result);
    }
    const result2 = await create_hold_booking({ bookingDetails, session_id, numberOfPlayers });
    if (result2.error) {
      setAlert(true);
      setAlertMessage(result2?.error, result2?.detail);
      return;
    } else {
      set_localstorage('bookingId', result2.id);
    }
    setBookingDetails(result2);
    setIsLoading(false);
  }

  async function delete_booking_error({ paymentData, zohoReceiptID }) {
    delete_booking_on_error({ paymentData, shiftDetails, zohoReceiptID });
    let bookingId = get_localstorage('bookingId');
    if (bookingId) {
      delete_hold_booking({ bookingId });
    }
  }

  async function Book() {
    setIsLoading(true);
    let salesReceiptData = {};
    let create_payment_api_result = await create_payment_api({ shiftDetails, orderDetails, paymentMethod });
    if (create_payment_api_result.error) {
      setAlert(true);
      setAlertMessage(create_payment_api_result?.error, create_payment_api_result?.detail);
      return;
    }
    if (create_payment_api_result.errors) {
      setAlert(true);
      setAlertMessage(`${create_payment_api_result.errors[0].detail} - ${create_payment_api_result.errors[0].field}`);
      return;
    }
    let paymentData = await create_payment_api_result.payment;
    setPaymentDetails(paymentData);
    if (selectedZohoItems && selectedZohoItems.length > 0) {
      let result2 = await create_sales_receipt({ shiftDetails, orderDetails, paymentData, selectedZohoItems });
      if (result2.code !== 0) {
        delete_booking_error({ paymentData });
        setAlert(true);
        setAlertMessage('This error from zoho: ' + result2.message);
        return;
      }
      salesReceiptData = await result2;
      setSalesReceiptDetails(salesReceiptData);
    }
    const options = orderDetails.line_items;
    await add_to_inventory({ shiftDetails, subShiftDetails, paymentData, options, note });
    console.log('customerName', customerName);
    console.log('isRealCustomerName', isRealCustomerName(customerName));
    let customerData = null;
    if (isRealCustomerName(customerName)) {
      customerData = await create_customer({ customerName });
      if (customerData.error) {
        setAlert(true);
        setAlertMessage(customerData.error || 'error1');
        return;
      }
    }
    await setBookingDetails((prev) => ({
      ...prev,
      booking_customer: isRealCustomerName(customerName) ? customerData.id : null,
      customer_name: customerName,
      options: orderDetails.line_items,
      payment: {
        amount: paid,
        method: paymentData.source_type === 'CASH' ? 'cash' : 'creditcard',
        promoCode: promoCode?.name,
        percentage: promoCode?.percentage,
      },
      number_of_players: numberOfPlayers,
      type_of_players: selectedCategory,
      creation_agent: shiftDetails.user.username,
      created_at: orderDetails.created_at,
      square_receipt_number: paymentData.receipt_number,
      square_payment_id: paymentData.id,
      square_order_id: orderDetails.id,
      zoho_sales_receipt_id: salesReceiptData ? salesReceiptData?.sales_receipt_details?.sales_receipt_id : null,
      zoho_sales_receipt_num: salesReceiptData ? salesReceiptData?.sales_receipt_details?.receipt_number : null,
      note: note ? note : null,
      status: 'done',
    }));
    set_localstorage('bookingId', undefined);
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <Box>
      {shiftDetails && sessionsDetails[0] && allCustomers && (
        <>
          <LoadingFun open={isLoading} />
          <AlertFun set_open_alert={setAlert} open_alert={alert} message={alertMessage} setLoading={setIsLoading} />

          {/* Invoice after successful booking */}
          {bookingSuccess && (
            <InvoicePrint
              shift={{
                square_receipt_number: paymentDetails.receipt_number,
                branch_name: shiftDetails.branch_name,
                location_name: shiftDetails.location_name,
                city: shiftDetails.city,
                total_price: paymentDetails.total_money.amount / 100,
                first_paid: paymentDetails.total_money.amount / 100,
                first_paid_method: paymentDetails.source_type === 'CASH' ? 'cash' : 'creditcard',
                options: orderDetails.line_items,
                discount: promoCode?.name,
                dateTime: orderDetails.created_at,
                creation_agent: shiftDetails.user.username,
              }}
              note={note}
              setNote={setNote}
            />
          )}

          {/* Booking form */}
          {!bookingSuccess && (
            <Fragment>
              {/* Page title */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                  New Booking — {sessionsDetails[0].product.nick_name}
                </Typography>
                <Chip
                  label={`${sessionsDetails[0].available_seats} seats available`}
                  color={sessionsDetails[0].available_seats === 0 ? 'error' : sessionsDetails[0].available_seats <= 3 ? 'warning' : 'success'}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>

              <Grid container spacing={3}>
                {/* ── Left column: booking details ───── */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid var(--gc-border2)', display: 'flex', flexDirection: 'column', gap: 2 }}>

                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                      Customer Details
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Autocomplete
                        disablePortal
                        freeSolo
                        id="combo-box-demo"
                        options={allCustomers.map((customer) => customer.identifier || '')}
                        value={customerName}
                        onInputChange={(event, newInputValue) => {
                          if (newInputValue && newInputValue.trim() !== '') {
                            setCustomerName(newInputValue);
                          }
                        }}
                        renderInput={(params) => <TextField {...params} label="Customer Name" size="small" />}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        value={numberOfPlayers}
                        inputProps={{ min: 1, max: sessionsDetails[0].available_seats }}
                        onChange={(e) => setNumberOfPlayers(Number(e.target.value))}
                        type="number"
                        size="small"
                        label="Players"
                        sx={{ width: 90 }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={promotrue}
                            onChange={() => set_promotrue(!promotrue)}
                            size="small"
                          />
                        }
                        label="Promo"
                        sx={{ ml: 0, mr: 0 }}
                      />
                    </Box>

                    <Divider />

                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.75rem' }}>
                      Session Type
                    </Typography>
                    <RadioGroup
                      row
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      sx={{ gap: 0.5 }}
                    >
                      {Object.entries(allSquareItems[sessionsDetails[0].product.nick_name]).map(([key]) => (
                        <FormControlLabel key={key} label={key} value={key} control={<Radio size="small" />} />
                      ))}
                    </RadioGroup>

                    <Autocomplete
                      disablePortal
                      freeSolo
                      id="Promo Code"
                      options={(allPromoCodes?.results || []).map((promo_code) => promo_code.code)}
                      onInputChange={(event, newValue) => {
                        let promo_code = allPromoCodes.find((pc) => pc.code === newValue);
                        if (promo_code) {
                          setSelectedPromoCode(promo_code);
                        } else {
                          setSelectedPromoCode();
                        }
                      }}
                      renderInput={(params) => <TextField {...params} label="Promo Code" size="small" />}
                    />

                    <TextField
                      required
                      label="Total (read-only — click 'Get Total' to update)"
                      value={parseInt(paid)}
                      InputProps={{ readOnly: true }}
                      size="small"
                      fullWidth
                    />

                    {/* Payment method toggle cards */}
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', display: 'block', mb: 1 }}>
                        Payment Method
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5 }}>
                        {[
                          {
                            value: 'cash',
                            label: 'Cash',
                            icon: <LocalAtmIcon sx={{ fontSize: 22 }} />,
                            bg: 'linear-gradient(135deg, #F7941D 0%, #e07d0a 100%)',
                            shadow: 'rgba(247, 148, 29, 0.45)',
                          },
                          {
                            value: 'creditcard',
                            label: 'Visa',
                            icon: <CreditCardIcon sx={{ fontSize: 22 }} />,
                            bg: 'linear-gradient(135deg, #E91E8C 0%, #c4177a 100%)',
                            shadow: 'rgba(233, 30, 140, 0.45)',
                          },
                        ].map((method) => {
                          const isSelected = paymentMethod === method.value;
                          return (
                            <Box
                              key={method.value}
                              onClick={() => setPaymentMethod(method.value)}
                              sx={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 1,
                                py: 1.25,
                                px: 2,
                                borderRadius: 2,
                                background: method.bg,
                                boxShadow: `0 4px 16px ${method.shadow}`,
                                opacity: isSelected ? 1 : 0.45,
                                cursor: 'pointer',
                                transition: 'all 0.18s ease',
                                userSelect: 'none',
                                transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                                '&:hover': {
                                  opacity: 1,
                                  boxShadow: `0 6px 22px ${method.shadow}`,
                                  transform: 'scale(1.03)',
                                },
                              }}
                            >
                              <Box sx={{ color: '#ffffff', display: 'flex' }}>
                                {method.icon}
                              </Box>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 700, color: '#ffffff' }}
                              >
                                {method.label}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <TextField
                        label="Custom Item Name"
                        onChange={(e) => setCustomItem((prev) => ({ ...prev, name: e.target.value }))}
                        value={customItem.name}
                        size="small"
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Custom Price"
                        onChange={(e) =>
                          setCustomItem((prev) => ({
                            ...prev,
                            base_price_money: { amount: e.target.value * 100, currency: 'EGP' },
                          }))
                        }
                        value={customItem.base_price_money.amount / 100}
                        size="small"
                        sx={{ width: 120 }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5, pt: 1 }}>
                      <Button variant="outlined" onClick={() => hold_booking()} fullWidth>
                        Get Total
                      </Button>
                      <Button variant="contained" onClick={Book} fullWidth>
                        Confirm Booking
                      </Button>
                    </Box>
                  </Paper>
                </Grid>

                {/* ── Right column: add-ons ─────────── */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid var(--gc-border2)', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'secondary.main', mb: 0.5 }}>
                      Add-Ons
                    </Typography>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      {(() => {
                        const accentColors = ['#00AEEF', '#F7941D'];
                        return [
                          ...Object.entries(allSquareItems['Add On'] || {}),
                          ...Object.entries(allSquareItems[sessionsDetails[0].product.nick_name + '+'] || {}),
                        ].map(([key, value], index) => {
                        const qty = Number(selectedOptions[key] || 0);
                        const isActive = qty > 0;
                        const accent = accentColors[index % 2];
                        return (
                          <Box
                            key={value}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              px: 1.5,
                              py: 1,
                              borderRadius: 2,
                              borderTop: '1px solid var(--gc-border2)',
                              borderRight: '1px solid var(--gc-border2)',
                              borderBottom: '1px solid var(--gc-border2)',
                              borderLeft: `4px solid ${accent}`,
                              bgcolor: isActive ? 'rgba(var(--gc-blue-rgb), 0.04)' : 'background.paper',
                              transition: 'background 0.15s, box-shadow 0.15s',
                              '&:hover': {
                                boxShadow: `0 2px 10px ${accent}33`,
                                bgcolor: 'rgba(var(--gc-blue-rgb), 0.04)',
                              },
                            }}
                          >
                            {/* Label — click to increment */}
                            <Box
                              onClick={() => handle_addon_change(key, 1)}
                              sx={{ cursor: 'pointer', flex: 1, userSelect: 'none', py: 0.5, '&:hover .addon-label': { color: 'primary.main' } }}
                            >
                              <Typography
                                className="addon-label"
                                variant="body2"
                                sx={{ fontWeight: 600, color: isActive ? 'primary.main' : 'secondary.main', lineHeight: 1.3, transition: 'color 0.15s' }}
                              >
                                {key}
                              </Typography>
                            </Box>

                            {/* − value + stepper */}
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                border: '1.5px solid',
                                borderColor: isActive ? 'primary.main' : 'var(--gc-border2)',
                                borderRadius: 1.5,
                                overflow: 'hidden',
                                bgcolor: 'background.paper',
                              }}
                            >
                              <IconButton
                                size="small"
                                onClick={() => handle_addon_change(key, -1)}
                                disabled={qty === 0}
                                sx={{ width: 28, height: 28, borderRadius: 0, color: 'primary.main', '&:hover': { bgcolor: 'rgba(var(--gc-blue-rgb), 0.08)' } }}
                              >
                                <RemoveIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                              <InputBase
                                type="number"
                                value={qty}
                                onChange={(e) => {
                                  const val = Math.max(0, Math.min(sessionsDetails[0].available_seats, parseInt(e.target.value) || 0));
                                  setSelectedOptions((prev) => ({ ...prev, [key]: String(val) }));
                                }}
                                inputProps={{ min: 0, max: sessionsDetails[0].available_seats, style: { textAlign: 'center', fontWeight: 700, fontSize: '0.875rem', padding: 0, width: 36, height: 28, color: isActive ? 'var(--gc-blue)' : 'var(--gc-text)' } }}
                                sx={{ borderLeft: '1.5px solid var(--gc-border2)', borderRight: '1.5px solid var(--gc-border2)' }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handle_addon_change(key, 1)}
                                disabled={qty >= sessionsDetails[0].available_seats}
                                sx={{ width: 28, height: 28, borderRadius: 0, color: 'primary.main', '&:hover': { bgcolor: 'rgba(var(--gc-blue-rgb), 0.08)' } }}
                              >
                                <AddIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Box>
                          </Box>
                        );
                        });
                      })()}
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <TextField
                      label="Notes"
                      multiline
                      maxRows={4}
                      onChange={(e) => setNote(e.target.value)}
                      fullWidth
                      size="small"
                    />

                    {orderDetails && (
                      <Box
                        sx={{
                          mt: 1,
                          p: 2,
                          borderRadius: 2,
                          bgcolor: 'action.hover',
                          border: '1px solid var(--gc-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Calculated Total
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                          {orderDetails.total_money.amount / 100} EGP
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </Fragment>
          )}
        </>
      )}
    </Box>
  );
}
