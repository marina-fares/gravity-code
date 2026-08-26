/* eslint-disable react/jsx-no-undef */
import { useEffect, useState } from 'react';
import { app_api_get } from '../../components/logic/apis';
import { get_localstorage } from '../../components/logic/localstorage';
import { useNavigate } from 'react-router-dom';
import { get_shift, get_sub_shift, set_shift, set_sub_shift, get_current_group } from '../../components/logic/shifts_functions_apis';
import * as React from 'react';
import { get_user_and_jwt } from '../../components/logic/users';
import {
  Grid, Input, Button, FormControl, TextField, RadioGroup,
  FormControlLabel, Radio, Typography, Box, Paper, Divider, IconButton, InputBase
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import LoadingFun from '../../components/ui/loading';
import AlertFun from '../../components/ui/alert';
import { InvoicePrint } from '../../components/ui/booking_invoice';
import { app_post } from '../../components/logic/app';

export default function Options() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentGroup, setCurrentGroup] = useState();

  let [shiftDetails, setShiftDetails] = useState(null);
  let [subShiftDetails, setSubShiftDetails] = useState(null);
  let [options, setOptions] = useState({});
  let [firstPaid, setFirstPaid] = useState(0);
  let [paymentMethod, setPaymentMethod] = useState('cash');
  let [alert, setAlert] = useState(false);
  let [alertMessage, setAlertMessage] = useState(true);
  let [totalPrice, setTotalPrice] = useState(0);
  let [squareLineItems, setSquareLineItems] = useState([]);
  let [bookingsuccess, set_bookingsuccess] = useState(false);
  let [zohoItems, setZohoItems] = useState();
  let [zohoAllItems,] = useState(JSON.parse(get_localstorage('zohoItems')));
  let [zoho_sales_receipt_id, set_zoho_sales_receipt_id] = useState();
  let [zoho_sales_receipt_number, set_zoho_sales_receipt_number] = useState();
  let [payment, setPayment] = useState();
  let [val, set_val] = useState();
  let [orderDetails, setOrderDetails] = useState();
  let [customItem, setCustomItem] = useState({
    name: 'Custom Item',
    quantity: '1',
    base_price_money: { amount: 0, currency: 'EGP' },
  });

  useEffect(() => {
    const fetchData = async () => {
      const shiftData = await get_shift();
      if (shiftData.status === 200) {
        setShiftDetails(shiftData.data);
      } else {
        setAlert(true);
        setAlertMessage(shiftData.error);
      }
      const subShiftData = await get_sub_shift();
      if (subShiftData.status === 200) {
        setSubShiftDetails(subShiftData.data);
      } else {
        setAlert(true);
        setAlertMessage(subShiftData.error);
      }
      const groupName = await get_current_group();
      setCurrentGroup(groupName);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (
      ((squareLineItems.length === Object.keys(options).length) ||
        squareLineItems.length === Object.keys(options).length + 1) &&
      !bookingsuccess &&
      squareLineItems.length !== 0
    ) {
      create_order_api();
    }
  }, [squareLineItems, zohoItems]);

  function create_order_api() {
    setIsLoading(true);
    app_api_get('square/', {
      request_type: 'post',
      url: '/orders',
      payload: {
        order: {
          location_id: shiftDetails.square_location_id,
          line_items: squareLineItems,
          state: 'OPEN',
          customer_id: shiftDetails.customer_id,
        },
      },
    }).then((response) => {
      setIsLoading(false);
      if (response.order) {
        setTotalPrice(response.order.total_money.amount / 100);
        setFirstPaid(response.order.total_money.amount);
        setOrderDetails(response.order);
      } else {
        setAlert(true);
        setAlertMessage(response.errors[0].detail);
      }
    });
  }

  async function create_payment_api() {
    let data = {
      order_id: orderDetails.id,
      location_id: shiftDetails.square_location_id,
      note: `Booking owner: ${shiftDetails.user.username}`,
      source_id: paymentMethod === 'cash' ? 'CASH' : 'EXTERNAL',
      amount: orderDetails.total_money.amount,
      amount_money: { amount: orderDetails.total_money.amount, currency: 'EGP' },
      team_member_id: shiftDetails.square_team_member_id,
      customer_id: shiftDetails.customer_id,
    };
    if (paymentMethod === 'cash') {
      data.cash_details = {
        buyer_supplied_money: { amount: orderDetails.total_money.amount, currency: 'EGP' },
      };
    } else {
      data.autocomplete = true;
    }
    const response = await app_api_get('square/', { request_type: 'post', url: '/payments', payload: data });
    if (response.payment) {
      setPayment(response.payment);
      return response.payment;
    } else if (response.error) {
      setAlert(true);
      setAlertMessage(response.error);
      return;
    } else if (response.errors) {
      setAlert(true);
      setAlertMessage(`${response.errors[0].detail} - ${response.errors[0].field}`);
      return;
    }
  }

  async function update_inventory(payment_result, receipt) {
    let updatedShiftData = await shiftDetails;
    let updatedSubShiftData = await subShiftDetails;
    await orderDetails.line_items.forEach((item) => {
      if (updatedShiftData.inventory[item.name]) {
        updatedShiftData.inventory[item.name].sold_at_square += parseInt(item.quantity);
      }
    });
    if (paymentMethod === 'cash') {
      updatedShiftData.shift_money_cash = Number(updatedShiftData.shift_money_cash) + parseInt(firstPaid) / 100;
      updatedSubShiftData.shift_money_cash = Number(updatedSubShiftData.shift_money_cash) + parseInt(firstPaid) / 100;
    } else if (paymentMethod === 'creditcard') {
      updatedShiftData.shift_money_visa = Number(updatedShiftData.shift_money_visa) + parseInt(firstPaid) / 100;
      updatedSubShiftData.shift_money_visa = Number(updatedSubShiftData.shift_money_visa) + parseInt(firstPaid) / 100;
    }
    let old_options = await (updatedShiftData.options2 ? updatedShiftData.options2 : []);
    let new_options = await [{ [payment_result.receipt_number]: orderDetails.id }];
    updatedShiftData.options2 = await [...old_options, ...new_options];
    await set_shift(updatedShiftData);
    await set_sub_shift(updatedSubShiftData);
    await create_booking_in_backend(payment_result, receipt);
    set_bookingsuccess(true);
    setIsLoading(false);
  }

  // Returns { id, num } on success, or null on failure. Must be awaited so the
  // booking is not saved before Zoho responds. Do NOT rely on React state for
  // the result — state updates are async and won't be visible to the caller in
  // the same tick.
  async function create_sales_receipt({ payment_result }) {
    if (!zohoItems || zohoItems.length === 0) {
      return null;
    }
    const today = new Date();
    const response = await app_api_get('zoho/', {
      request_type: 'post',
      url: '/salesreceipts',
      payload: {
        is_generic_customer: true,
        customer_name: 'Options Page',
        date:
          today.getFullYear() +
          '-' +
          String(today.getMonth() + 1).padStart(2, '0') +
          '-' +
          String(today.getDate()).padStart(2, '0'),
        line_items: zohoItems,
        payment_mode: paymentMethod,
        custom_fields: [
          { label: 'Product', value: 'Park' },
          { label: 'Gravity Branch', value: shiftDetails.user.group_name },
          { label: 'Staff Name', value: get_user_and_jwt().user.username },
          {
            label: 'Date and Time',
            value:
              today.getFullYear() +
              '-' +
              String(today.getMonth() + 1).padStart(2, '0') +
              '-' +
              String(today.getDate()).padStart(2, '0') +
              ' ' +
              String(today.getHours()).padStart(2, '0') +
              ':' +
              String(today.getMinutes()).padStart(2, '0') +
              ':' +
              String(today.getSeconds()).padStart(2, '0'),
          },
          { label: 'Square receipt number', value: payment_result.receipt_number },
        ],
      },
    });

    if (response && response.code === 0) {
      const id = response.sales_receipt_details.sales_receipt_id;
      const num = response.sales_receipt_details.receipt_number;
      set_zoho_sales_receipt_id(id);
      set_zoho_sales_receipt_number(num);
      return { id, num };
    }
    // Zoho failed (e.g. transient 502) — do NOT block the booking. Return null
    // so it is saved without a receipt ID and shows up on the End Shift page
    // for a manual repost.
    console.warn('Zoho sales receipt failed (Options page):', response?.message || response?.error);
    return null;
  }

  function startOrder() {
    setSquareLineItems([]);
    setZohoItems([]);
    for (const [key, value] of Object.entries(options)) {
      setSquareLineItems((squareLineItems) => [
        ...squareLineItems,
        { quantity: String(value), catalog_object_id: shiftDetails.inventory[key].id },
      ]);
      // Guard: a selected option may not exist in the zohoItems mapping.
      // Without this check zohoAllItems[key][0] throws, leaving zohoItems
      // empty/partial and the Zoho receipt would be rejected.
      if (value[0] !== 0 && zohoAllItems && zohoAllItems[key]) {
        setZohoItems((zohoItems) => [
          ...zohoItems,
          { quantity: value.toString(), item_id: zohoAllItems[key][0], rate: zohoAllItems[key][1], tax_id: '5118629000000088105' },
        ]);
      }
    }
    if (customItem.base_price_money.amount > 0 && customItem.name !== '') {
      setSquareLineItems((prev) => [...prev, customItem]);
      setZohoItems((prev) => [
        ...prev,
        { name: customItem.name, quantity: 1, rate: customItem.base_price_money.amount / 114, tax_id: '5118629000000088105' },
      ]);
    }
  }

  async function create_booking_in_backend(payment_result, receipt) {
    let data = {
      options: orderDetails.line_items,
      payment: {
        amount: payment_result.amount_money.amount / 100,
        method: payment_result.source_type === 'CASH' ? 'cash' : 'creditcard',
        promoCode: '',
        percentage: '',
      },
      number_of_players: 0,
      creation_agent: shiftDetails.user.username,
      created_at: orderDetails.created_at,
      square_receipt_number: payment_result.receipt_number,
      square_payment_id: payment_result.id,
      square_order_id: orderDetails.id,
      // Use the receipt returned by create_sales_receipt (null on failure),
      // NOT React state — state is not yet updated in this closure.
      zoho_sales_receipt_id: receipt?.id ?? null,
      zoho_sales_receipt_num: receipt?.num ?? null,
      // Keep the exact Zoho payload so a failed post can be reposted from the
      // End Shift page.
      zoho_line_items: zohoItems?.length ? zohoItems : null,
      status: 'done',
    };
    await app_post('booking/', data);
  }

  function setFirstPaid_fun(e) {
    const value = Math.max(0, Math.min(10000000000, Number(e.target.value)));
    setFirstPaid(value);
  }

  async function compelete_order() {
    setIsLoading(true);
    let payment_result = await create_payment_api();
    // Payment failed — create_payment_api already showed the alert. Stop here
    // so we don't create a receipt/booking for a payment that never happened.
    if (!payment_result) {
      setIsLoading(false);
      return;
    }
    const receipt = await create_sales_receipt({ payment_result });
    await update_inventory(payment_result, receipt);
  }

  const handleAddInput = (key) => {
    if (options[key] === undefined) {
      setOptions({ ...options, [key]: [1] });
    } else {
      let value = options[key][0] + 1;
      setOptions((options) => ({ ...options, [key]: [value] }));
    }
  };

  function handle_option_change(key, delta) {
    setOptions((prev) => {
      const current = Number((prev[key] || [0])[0]);
      const next = Math.max(0, current + delta);
      return { ...prev, [key]: [next] };
    });
  }

  if (!shiftDetails || !shiftDetails.current_shift_id) {
    return (
      <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, textAlign: 'center', maxWidth: 400, border: '1px solid var(--gc-border2)' }}>
          <Typography variant="h6" sx={{ color: 'secondary.main', fontWeight: 600 }}>
            No Active Shift
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Loading your shift… If you haven't started your shift yet, kindly do so.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <LoadingFun open={isLoading} />
      <AlertFun set_open_alert={setAlert} open_alert={alert} message={alertMessage} setLoading={setIsLoading} />

      {/* ── Success: print invoice ─────────────────── */}
      {orderDetails && payment && bookingsuccess && (
        <Box sx={{ maxWidth: '100mm', mx: 'auto' }}>
          <InvoicePrint
            shift={{
              square_receipt_number: payment.receipt_number,
              branch_name: shiftDetails.branch_name,
              location_name: shiftDetails.location_name,
              city: shiftDetails.city,
              total_price: payment.amount_money.amount / 100,
              first_paid: payment.amount_money.amount / 100,
              first_paid_method: payment.source_type,
              options: orderDetails.line_items,
              dateTime: orderDetails.created_at,
              discount: orderDetails.discounts ? orderDetails.discounts[0].percentage : null,
              bookingsuccess: bookingsuccess,
              creation_agent: shiftDetails.user.username,
            }}
            note={val}
            set_note={set_val}
          />
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/')}>
              Close
            </Button>
          </Box>
        </Box>
      )}

      {/* ── Options form ──────────────────────────── */}
      {!bookingsuccess && (
        <Box sx={{ maxWidth: 960, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'secondary.main' }}>
              Options
            </Typography>
          </Box>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid var(--gc-border2)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.72rem', mb: 0.5, gridColumn: '1 / -1' }}>
              Inventory Items
            </Typography>
            {shiftDetails && (() => {
              const accentColors = ['#00AEEF', '#F7941D', '#E91E8C'];
              return Object.keys(shiftDetails.inventory).map((key, index) => {
              const qty = Number((options[key] || [0])[0]);
              const isActive = qty > 0;
              const accent = accentColors[index % 3];
              return (
                <Box
                  key={key}
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
                  <Typography
                    variant="body2"
                    onClick={() => handle_option_change(key, 1)}
                    sx={{
                      fontWeight: 600,
                      color: isActive ? 'primary.main' : 'secondary.main',
                      cursor: 'pointer',
                      flex: 1,
                      userSelect: 'none',
                      py: 0.5,
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    {key}
                  </Typography>

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
                      onClick={() => handle_option_change(key, -1)}
                      disabled={qty === 0}
                      sx={{ width: 28, height: 28, borderRadius: 0, color: 'primary.main', '&:hover': { bgcolor: 'rgba(var(--gc-blue-rgb), 0.08)' } }}
                    >
                      <RemoveIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                    <InputBase
                      type="number"
                      value={qty}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setOptions((prev) => ({ ...prev, [key]: [val] }));
                      }}
                      inputProps={{ min: 0, style: { textAlign: 'center', fontWeight: 700, fontSize: '0.875rem', padding: 0, width: 36, height: 28, color: isActive ? 'var(--gc-blue)' : 'var(--gc-text)' } }}
                      sx={{ borderLeft: '1.5px solid var(--gc-border2)', borderRight: '1.5px solid var(--gc-border2)' }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handle_option_change(key, 1)}
                      sx={{ width: 28, height: 28, borderRadius: 0, color: 'primary.main', '&:hover': { bgcolor: 'rgba(var(--gc-blue-rgb), 0.08)' } }}
                    >
                      <AddIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                </Box>
              );
              });
            })()}
          </Paper>

          {/* ── Custom item + payment ─────────────── */}
          <Paper elevation={0} sx={{ mt: 3, p: 3, borderRadius: 2.5, border: '1px solid var(--gc-border2)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'secondary.main', mb: 2 }}>
              Custom Item & Payment
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  label="Custom Item Name"
                  onChange={(e) => setCustomItem((prev) => ({ ...prev, name: e.target.value }))}
                  value={customItem.name}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  label="Custom Item Price"
                  onChange={(e) =>
                    setCustomItem((prev) => ({
                      ...prev,
                      base_price_money: { amount: e.target.value * 100, currency: 'EGP' },
                    }))
                  }
                  value={customItem.base_price_money.amount / 100}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  label="Amount to Pay"
                  onChange={setFirstPaid_fun}
                  value={parseInt(firstPaid) / 100}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', display: 'block', mb: 1 }}>
                  Payment Method
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  {[
                    { value: 'cash', label: 'Cash', icon: <LocalAtmIcon sx={{ fontSize: 22 }} />, bg: 'linear-gradient(135deg, #F7941D 0%, #e07d0a 100%)', shadow: 'rgba(247, 148, 29, 0.45)' },
                    { value: 'creditcard', label: 'Visa', icon: <CreditCardIcon sx={{ fontSize: 22 }} />, bg: 'linear-gradient(135deg, #E91E8C 0%, #c4177a 100%)', shadow: 'rgba(233, 30, 140, 0.45)' },
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
                          '&:hover': { opacity: 1, boxShadow: `0 6px 22px ${method.shadow}`, transform: 'scale(1.03)' },
                        }}
                      >
                        <Box sx={{ color: '#ffffff', display: 'flex' }}>{method.icon}</Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#ffffff' }}>{method.label}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
              {totalPrice > 0 && (
                <Typography variant="h6" sx={{ color: 'secondary.main', fontWeight: 700 }}>
                  Total: {totalPrice} EGP
                </Typography>
              )}
              <Button variant="outlined" size="large" onClick={startOrder}>
                Calculate Total
              </Button>
              <Button variant="contained" size="large" onClick={compelete_order}>
                Complete Order
              </Button>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
