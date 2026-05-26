import { useEffect, useRef, useState } from 'react';
import { Button, Grid, Alert, FormControl, Typography, Box, Paper, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import InvoicePrint from '../../components/ui/InvoicePrint';
import { get_shift, get_sub_shift } from '../../components/logic/shifts_functions_apis';
import { split_shift } from '../../components/logic/shifts_functions';

export default function EndSubShift() {
  const [shift_details, set_shift_details] = useState(null);
  const [sub_shift_details, set_sub_shift_details] = useState(null);
  const [passwordValid, setPasswordValid] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [actualCash, setActualCash] = useState(0);
  const [actualVisa, setActualVisa] = useState(0);
  const printRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const shiftData = await get_shift();
      if (shiftData.status === 200) {
        set_shift_details(shiftData.data);
      }
      const subShiftData = await get_sub_shift();
      if (subShiftData.status === 200) {
        set_sub_shift_details(subShiftData.data);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (shift_details?.endshift_page_password === e.target.password.value) {
      setShowAlert(false);
      setPasswordValid(true);
    } else {
      setShowAlert(true);
    }
  };

  async function split_shift_fun() {
    const response = await split_shift(shift_details, sub_shift_details);
    navigate('/');
  }

  if (!shift_details?.current_shift_id) {
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

  if (!passwordValid) {
    return (
      <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid var(--gc-border2)' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.main', mb: 3 }}>
            Sub-Shift Authentication
          </Typography>
          {showAlert && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              Incorrect password
            </Alert>
          )}
          <FormControl component="form" onSubmit={handleSubmit} fullWidth>
            <TextField
              id="password"
              label="Enter Password"
              type="password"
              name="password"
              fullWidth
              size="medium"
              sx={{ mb: 2 }}
            />
            <Button type="submit" fullWidth variant="contained" size="large">
              Submit
            </Button>
          </FormControl>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', mt: 4 }}>
      <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid var(--gc-border2)' }}>
        <Box
          sx={{
            px: 3, py: 2.5,
            background: 'linear-gradient(135deg, var(--gc-bg) 0%, var(--gc-bg2) 100%)',
            borderBottom: '1px solid var(--gc-border)',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'secondary.main' }}>
            Sub Shift {shift_details.sub_shift_round}
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <InvoicePrint
                sub_shift={sub_shift_details}
                shift={shift_details}
                calculated_cash={actualCash}
                calculated_visa={actualVisa}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                <TextField
                  label="Actual Cash in Drawer"
                  type="number"
                  value={actualCash}
                  onChange={(e) => {
                    setActualCash(e.target.value);
                    set_sub_shift_details((prev) => ({ ...prev, actual_cash: Number(e.target.value) }));
                  }}
                  fullWidth
                  size="medium"
                />

                <TextField
                  label="Actual Visa in Drawer"
                  type="number"
                  value={actualVisa}
                  onChange={(e) => {
                    setActualVisa(e.target.value);
                    set_sub_shift_details((prev) => ({ ...prev, actual_visa: Number(e.target.value) }));
                  }}
                  fullWidth
                  size="medium"
                />

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, textAlign: 'center', border: '1px solid var(--gc-border2)' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Shift Cash
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'secondary.main', fontWeight: 700, mt: 0.5 }}>
                        {sub_shift_details.shift_money_cash - sub_shift_details.refund_cash} LE
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, textAlign: 'center', border: '1px solid var(--gc-border2)' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Shift Visa
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'secondary.main', fontWeight: 700, mt: 0.5 }}>
                        {sub_shift_details.shift_money_visa} LE
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid var(--gc-border2)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'secondary.main', mb: 1 }}>
                    Waffarha Codes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {JSON.stringify(sub_shift_details.note)}
                  </Typography>
                </Paper>

              </Box>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }} ref={printRef}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/end-shift')}
            >
              End Shift Page
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={() => split_shift_fun()}
            >
              Split Shift
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
