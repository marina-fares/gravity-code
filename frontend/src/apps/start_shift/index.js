import { Button, Grid, TextField, Typography, Box, Paper, Divider } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get_shift, get_sub_shift, set_shift, set_sub_shift } from '../../components/logic/shifts_functions_apis';
import { get_catalog } from '../../components/logic/shifts_functions';
import { app_api_post } from '../../components/logic/apis';
import LoadingFun from '../../components/ui/loading';
import AlertFun from '../../components/ui/alert';

export default function StartShift() {
  const [shift_details, set_shift_details] = useState({});
  const [sub_shift_details, set_sub_shift_details] = useState({});
  const [catalog, set_catalog_details] = useState(null);
  const [open, setOpen] = useState(false);
  const [alert, setAlert] = useState(false);
  const [error_message, set_error_message] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    get_catalog().then((response) => set_catalog_details(response));
    get_sub_shift().then((data) => set_sub_shift_details(data));
  }, []);

  useEffect(() => {
    if (catalog) {
      get_shift().then((shiftData) => {
        console.log('shiftData', shiftData);
        if (shiftData.status === 200) {
          if (
            shiftData.data &&
            shiftData.data.start_time &&
            !shiftData.data.end_time &&
            shiftData.data.current_shift_id !== null
          ) {
            navigate('/home');
          }
          initializeShiftInventory(shiftData.data);
          set_shift_details(shiftData.data);
        } else {
          setAlert(true);
          set_error_message(shiftData.error);
        }
      });
    }
  }, [catalog]);

  const initializeShiftInventory = (shiftData) => {
    const inventory = {};
    catalog.objects.forEach((item) => {
      if (item.type === 'ITEM') {
        const itemName = item?.item_data?.name;
        inventory[itemName] = {
          start_shift: 0,
          sold: 0,
          sold_at_square: 0,
          refund: 0,
          id: item.item_data.variations[0].id,
        };
      }
    });
    shiftData.inventory = inventory;
  };

  const onStartShift = async () => {
    setOpen(true);
    app_api_post('square/', {
      request_type: 'post',
      url: '/labor/shifts',
      payload: {
        shift: {
          wage: {},
          status: 'OPEN',
          location_id: shift_details.square_location_id,
          team_member_id: shift_details.square_team_member_id,
        },
      },
    }).then((res) => {
      if (res.errors) {
        setOpen(false);
        setAlert(true);
        set_error_message(`${res.errors[0].detail} ${res.errors[0].field}`);
      } else {
        const actual_start = res?.shift?.start_at;
        updateShiftData(res, actual_start);
        navigate('/home');
        setOpen(false);
      }
    });
  };

  const updateShiftData = async (res, date) => {
    shift_details.start_time = date;
    shift_details.sub_shift_round = 1;
    shift_details.end_time = null;
    shift_details.current_shift_id = res?.shift?.id;

    sub_shift_details.start_time = date;
    sub_shift_details.end_time = null;
    sub_shift_details.current_shift_id = res?.shift?.id;

    set_shift({ ...shift_details });
    set_sub_shift({ ...sub_shift_details });
  };

  const updateMoney = (money) => {
    shift_details.start_shift_cash = Number(money);
    set_shift_details({ ...shift_details });

    sub_shift_details.start_shift_cash = Number(money);
    set_sub_shift_details({ ...sub_shift_details });
  };

  const updateInventory = (key, value) => {
    shift_details.inventory[key].start_shift = value ? parseInt(value) : 0;
    set_shift_details({ ...shift_details });
  };

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', mt: 4 }}>
      <LoadingFun open={open} />
      <AlertFun open_alert={alert} set_open_alert={setAlert} message={error_message} setLoading={setOpen} />

      <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid var(--gc-border2)' }}>

        {/* ── Header ──────────────────────────────────── */}
        <Box
          sx={{
            px: 3,
            py: 2.5,
            background: 'linear-gradient(135deg, #F7941D 0%, #e07d0a 100%)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 4px 20px rgba(247, 148, 29, 0.4)',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff' }}>
            Start Shift
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'rgba(255,255,255,0.85)' }}>
            Enter your opening cash and inventory counts before starting.
          </Typography>
        </Box>

        {/* ── Body ────────────────────────────────────── */}
        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>

            {/* Opening cash */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Opening Cash"
                value={`${shift_details.start_shift_cash || ''}`}
                onChange={(e) => updateMoney(e.target.value)}
                inputMode="numeric"
                fullWidth
                size="medium"
              />
            </Grid>

            {/* Inventory section */}
            <Grid item xs={12}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'secondary.main', mb: 2 }}>
                Opening Inventory
              </Typography>
              <Grid container spacing={2}>
                {shift_details.inventory && (() => {
                  const accentColors = ['#00AEEF', '#F7941D', '#E91E8C'];
                  return Object.keys(shift_details.inventory).map((key, idx) => {
                    const accent = accentColors[idx % 3];
                    return (
                      <Grid item xs={6} sm={4} md={2} key={key}>
                        <TextField
                          inputMode="numeric"
                          label={key}
                          defaultValue={shift_details.inventory[key].start_shift || ''}
                          onChange={(e) => updateInventory(key, e.target.value)}
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
            </Grid>

          </Grid>

          {/* ── Action ──────────────────────────────────── */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              onClick={onStartShift}
              sx={{
                px: 4,
                fontSize: '0.95rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #F7941D 0%, #e07d0a 100%)',
                boxShadow: '0 4px 20px rgba(247, 148, 29, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #e07d0a 0%, #c96d08 100%)',
                  boxShadow: '0 6px 24px rgba(247, 148, 29, 0.55)',
                },
              }}
            >
              Start Shift
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
