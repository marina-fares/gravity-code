import { useEffect, useRef, useState } from 'react';
import { Button, Grid, Alert, FormControl, Typography, Box, Paper, Divider, TextField, Chip } from '@mui/material';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import InvoicePrint from '../../components/ui/InvoicePrint';
import { get_shift, get_sub_shift } from '../../components/logic/shifts_functions_apis';
import { end_shift } from '../../components/logic/shifts_functions';
import LoadingFun from '../../components/ui/loading';
import AlertFun from '../../components/ui/alert';
import { useNavigate } from 'react-router-dom';

export default function EndShift() {
  const [shift_details, set_shift_details] = useState(null);
  const [sub_shift_details, set_sub_shift_details] = useState(null);
  const [passwordValid, setPasswordValid] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [actualCash, setActualCash] = useState(0);
  const [actualVisa, setActualVisa] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const navigate = useNavigate();
  const printRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      const shiftData = await get_shift();
      if (shiftData.status === 200) {
        set_shift_details(shiftData.data);
      } else {
        setAlert(true);
        setAlertMessage(shiftData.error);
      }
      const subShiftData = await get_sub_shift();
      if (subShiftData.status === 200) {
        set_sub_shift_details(subShiftData.data);
        if (shiftData.status === 200) {
          const d = shiftData.data;
          setActualCash((d.start_shift_cash || 0) + (d.shift_money_cash || 0) - (d.refund_cash || 0));
          setActualVisa(d.shift_money_visa || 0);
        }
      } else {
        setAlert(true);
        setAlertMessage(subShiftData.error);
      }
    };
    fetchData();
  }, []);

  async function end_shift_fun() {
    setLoading(true);
    const response = await end_shift(shift_details, sub_shift_details);
    if (response) {
      setLoading(false);
      setAlert(true);
      setAlertMessage(`${response[0].detail}, ${response[0].field}`);
    } else {
      navigate('/');
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (shift_details?.endshift_page_password === e.target.password.value) {
      setShowAlert(false);
      setPasswordValid(true);
    } else {
      setShowAlert(true);
    }
  };

  const renderInventoryTable = () => {
    if (!shift_details?.inventory) return null;
    const filteredItems = Object.entries(shift_details.inventory).filter(
      ([_, details]) => details.start_shift + details.sold + details.sold_at_square !== 0
    );
    if (filteredItems.length === 0) return null;
    return (
      <table className="table table-striped mt-4">
        <thead>
          <tr>
            <th>Item</th>
            <th>Start Shift</th>
            <th>Sold</th>
            <th>Sold at Square</th>
            <th>Refund</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map(([item, details]) => (
            <tr key={item}>
              <td>{item}</td>
              <td>{details.start_shift}</td>
              <td>{details.sold}</td>
              <td>{details.sold_at_square}</td>
              <td>{details.refund}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

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
            End Shift Authentication
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
      <LoadingFun open={loading} />
      <AlertFun set_open_alert={setAlert} open_alert={alert} message={alertMessage} setLoading={setLoading} />

      <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid var(--gc-border2)' }}>
        <Box
          sx={{
            px: 3, py: 2.5,
            background: 'linear-gradient(135deg, var(--gc-bg) 0%, var(--gc-bg2) 100%)',
            borderBottom: '1px solid var(--gc-border)',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'secondary.main' }}>
            End Shift
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <InvoicePrint shift={shift_details} calculated_cash={actualCash} calculated_visa={actualVisa} />
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                <TextField
                  label="Actual Cash in Drawer"
                  type="number"
                  value={actualCash}
                  onChange={(e) => {
                    setActualCash(e.target.value);
                    set_shift_details((prev) => ({ ...prev, actual_cash: Number(e.target.value) }));
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
                    set_shift_details((prev) => ({ ...prev, actual_visa: Number(e.target.value) }));
                    set_sub_shift_details((prev) => ({ ...prev, actual_visa: Number(e.target.value) }));
                  }}
                  fullWidth
                  size="medium"
                />

                <Grid container spacing={2}>
                  {/* ── Cash Card ── */}
                  <Grid item xs={12} sm={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        border: 'none',
                        background: 'linear-gradient(135deg, #F7941D 0%, #e07d0a 100%)',
                        boxShadow: '0 6px 24px rgba(247,148,29,0.45)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box
                          sx={{
                            width: 48, height: 48, borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <LocalAtmIcon sx={{ color: '#ffffff', fontSize: 26 }} />
                        </Box>
                        {shift_details.refund_cash > 0 && (
                          <Chip
                            label={`-EGP ${shift_details.refund_cash}`}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.25)',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              height: 22,
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: 'rgba(255,255,255,0.8)',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          fontSize: '0.68rem',
                          mb: 0.5,
                        }}
                      >
                        Cash Total
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 800, lineHeight: 1.1 }}>
                        {((shift_details.start_shift_cash || 0) + (shift_details.shift_money_cash || 0) - (shift_details.refund_cash || 0)).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)' }}>
                        EGP
                      </Typography>
                    </Paper>
                  </Grid>

                  {/* ── Visa Card ── */}
                  <Grid item xs={12} sm={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        border: 'none',
                        background: 'linear-gradient(135deg, #E91E8C 0%, #c4177a 100%)',
                        boxShadow: '0 6px 24px rgba(233,30,140,0.45)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box
                          sx={{
                            width: 48, height: 48, borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <CreditCardIcon sx={{ color: '#ffffff', fontSize: 26 }} />
                        </Box>
                        {shift_details.refund_visa > 0 && (
                          <Chip
                            label={`-EGP ${shift_details.refund_visa}`}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.25)',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              height: 22,
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: 'rgba(255,255,255,0.8)',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          fontSize: '0.68rem',
                          mb: 0.5,
                        }}
                      >
                        Visa Total
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 800, lineHeight: 1.1 }}>
                        {Number(shift_details.shift_money_visa || 0).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)' }}>
                        EGP
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid var(--gc-border2)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'secondary.main', mb: 1 }}>
                    Waffarha Codes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {JSON.stringify(shift_details.note)}
                  </Typography>
                </Paper>

              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'secondary.main', mb: 2 }}>
            Inventory Summary
          </Typography>
          {renderInventoryTable()}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              color="error"
              size="large"
              onClick={() => end_shift_fun()}
              sx={{ px: 4 }}
            >
              End Shift
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
