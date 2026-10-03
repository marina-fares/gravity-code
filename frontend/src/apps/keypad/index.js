import React, { useState } from 'react';
import { create_order, create_payment_api } from './functions_api';
import { useEffect } from 'react';
import { get_shift } from '../../components/logic/shifts_functions_apis';
import { RadioGroup, FormControlLabel, Radio, Typography, Box, Paper, Button } from '@mui/material';
import LoadingFun from '../../components/ui/loading';
import AlertFun from '../../components/ui/alert';
import { useNavigate } from 'react-router-dom';

export default function Keypad() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  let [shiftDetails, setShiftDetails] = useState('');
  let [paymentMethod, setPaymentMethod] = useState('cash');
  let [isLoading, setIsLoading] = useState(false);
  let [alertMessage, setAlertMessage] = useState('');
  let [alert, setAlert] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const shiftData = await get_shift();
      setShiftDetails(shiftData);
    };
    fetchData();
  }, []);

  const handleClick = (val) => {
    if (input.length < 10) setInput((prev) => prev + val);
  };

  const handleClear = () => setInput('');

  const handleSubmit = async () => {
    setIsLoading(true);
    setInput('');
    const amount = input;
    const orderDetails = await create_order({ shiftDetails, amount });
    if (orderDetails.error) {
      setAlert(true);
      setAlertMessage(orderDetails.error);
      setIsLoading(false);
      return;
    }
    const response2 = await create_payment_api({ shiftDetails, orderDetails, paymentMethod });
    if (response2.error) {
      setAlert(true);
      setAlertMessage(response2.error);
      setIsLoading(false);
      return;
    }
    navigate('/');
  };

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) setInput(value);
  };

  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'Clear', 0, 'Submit'];

  return (
    <Box sx={{ maxWidth: 280, mx: 'auto', mt: 6 }}>
      <LoadingFun open={isLoading} />
      <AlertFun open_alert={alert} set_open_alert={setAlert} message={alertMessage} setLoading={setIsLoading} />

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid var(--gc-border2)' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.main', mb: 2.5, textAlign: 'center' }}>
          Keypad
        </Typography>

        {/* ── Display ──────────────────────────────── */}
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          className="gc-keypad-input"
          placeholder="0"
        />

        {/* ── Number grid ──────────────────────────── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            mb: 2.5,
          }}
        >
          {keys.map((key, idx) => {
            const isSubmit = key === 'Submit';
            const isClear = key === 'Clear';
            return (
              <Button
                key={idx}
                variant={isSubmit ? 'contained' : isClear ? 'outlined' : 'outlined'}
                color={isSubmit ? 'primary' : isClear ? 'error' : 'secondary'}
                onClick={() => {
                  if (isClear) handleClear();
                  else if (isSubmit) handleSubmit();
                  else handleClick(key);
                }}
                sx={{
                  height: 56,
                  fontSize: isSubmit || isClear ? '0.85rem' : '1.25rem',
                  fontWeight: isSubmit || isClear ? 600 : 500,
                  borderRadius: 2,
                  minWidth: 0,
                }}
              >
                {key}
              </Button>
            );
          })}
        </Box>

        {/* ── Payment method ───────────────────────── */}
        <RadioGroup
          row
          name="payment-method"
          onChange={(e) => setPaymentMethod(e.target.value)}
          defaultValue="cash"
          sx={{ justifyContent: 'center', gap: 1 }}
        >
          <FormControlLabel value="cash" control={<Radio size="small" />} label="Cash" />
          <FormControlLabel value="creditcard" control={<Radio size="small" />} label="Credit" />
        </RadioGroup>
      </Paper>
    </Box>
  );
}
