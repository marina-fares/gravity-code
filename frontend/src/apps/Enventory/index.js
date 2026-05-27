import { Button, Grid, TextField, Typography, Box, Paper } from '@mui/material';
import { Fragment, useEffect, useState } from 'react';
import { get_shift, set_shift_fun } from './shifts_functions';
import { useNavigate } from 'react-router-dom';

export default function Inventory() {
  let [updated_shift, set_updated_shift] = useState({});
  let [hide, set_hide] = useState(false);

  useEffect(() => {
    let x = get_shift();
    x.then((x) => {
      if (x.status === 200) {
        set_updated_shift(x.data);
      }
      x.current_shift_id === null ? set_hide(true) : set_hide(false);
    });
  }, []);

  function onStartShift() {
    set_shift_fun(updated_shift);
  }

  function updated_shift_fun(key) {
    let value = document.getElementById(key).value;
    updated_shift.inventory[key]['start_shift'] = parseInt(value);
    set_updated_shift({ ...updated_shift });
  }

  if (hide) {
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
    <Box sx={{ maxWidth: 960, mx: 'auto', mt: 2 }}>
      {updated_shift && (
        <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid var(--gc-border2)' }}>

          <Box
            sx={{
              px: 3, py: 2.5,
              background: 'linear-gradient(135deg, #00AEEF 0%, #0090c9 100%)',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 4px 20px rgba(0, 174, 239, 0.4)',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff' }}>
              Inventory
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'rgba(255,255,255,0.85)' }}>
              Update opening inventory counts for the current shift.
            </Typography>
          </Box>

          <Box sx={{ p: 3 }}>
            <Grid container spacing={2}>
              {updated_shift.inventory && (() => {
                const accentColors = ['#00AEEF', '#F7941D', '#E91E8C'];
                return Object.keys(updated_shift.inventory).map((key, idx) => {
                  const accent = accentColors[idx % 3];
                  return (
                    <Grid item xs={6} sm={4} md={4} key={key}>
                      <TextField
                        inputMode="numeric"
                        label={key}
                        id={key}
                        value={updated_shift.inventory[key].start_shift || 0}
                        onChange={() => updated_shift_fun(key)}
                        fullWidth
                        sx={{
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderLeftWidth: '4px !important',
                            borderLeftColor: `${accent} !important`,
                          },
                        }}
                      />
                    </Grid>
                  );
                });
              })()}
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
              <Button
                variant="contained"
                size="large"
                onClick={onStartShift}
                sx={{
                  px: 4,
                  fontWeight: 700,
                  '&&': {
                    background: 'linear-gradient(135deg, #00AEEF 0%, #0090c9 100%)',
                    boxShadow: '0 4px 20px rgba(0, 174, 239, 0.4)',
                  },
                  '&&:hover': {
                    background: 'linear-gradient(135deg, #0090c9 0%, #0078a8 100%)',
                    boxShadow: '0 6px 24px rgba(0, 174, 239, 0.55)',
                  },
                }}
              >
                Update Inventory
              </Button>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
