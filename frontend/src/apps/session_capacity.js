import { Button, TextField, Typography, Box, Paper, Chip } from '@mui/material';
import { useState, useEffect } from 'react';
import { app_put } from '../components/logic/app';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingFun from '../components/ui/loading';
import AlertFun from '../components/ui/alert';
import { get_session_details } from './booking/functions_apis';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';

export default function SessionCapacity() {
  const navigate = useNavigate();
  let { session_id } = useParams();
  let [isLoading, setIsLoading] = useState();
  let [currentsessionDetails, setCurrentSessionDetails] = useState();
  let [addedSeats, setAddedSeats] = useState(0);
  let [alert, setAlert] = useState(false);
  let [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const sessionData = await get_session_details(session_id);
      if (sessionData.status === 200) {
        const currentSessionData = sessionData.data.find((session) => session.id == session_id);
        setCurrentSessionDetails(currentSessionData);
        setAddedSeats(currentSessionData.added_seats);
      } else {
        setAlert(true);
        setAlertMessage(sessionData.error);
      }
    };
    fetchData();
  }, [session_id]);

  const change_capacity = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!addedSeats || isNaN(addedSeats)) {
        throw new Error('Invalid number of seats');
      }
      const currentSession = {
        ...currentsessionDetails,
        added_seats: Number(addedSeats),
        product: currentsessionDetails.product.id,
      };
      await app_put(`session/${session_id}/`, {}, currentSession);
      navigate('/');
    } catch (error) {
      setAlert(true);
      setAlertMessage(`Error updating capacity: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 4 }}>
      <LoadingFun open={isLoading} />
      <AlertFun open_alert={alert} set_open_alert={setAlert} message={alertMessage} setLoading={setIsLoading} />

      {currentsessionDetails && (
        <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid var(--gc-border2)' }}>
          <Box
            sx={{
              px: 3, py: 2.5,
              background: 'linear-gradient(135deg, var(--gc-bg) 0%, var(--gc-bg2) 100%)',
              borderBottom: '1px solid var(--gc-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <PeopleAltOutlinedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.main', lineHeight: 1.2 }}>
                  Session Capacity
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentsessionDetails.product?.nick_name}
                </Typography>
              </Box>
            </Box>
            <Chip
              label={`Max: ${currentsessionDetails.product.max_num}`}
              color="primary"
              size="small"
            />
          </Box>

          <Box sx={{ p: 3 }}>
            <Box
              component="form"
              onSubmit={change_capacity}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <TextField
                label="Added Seats"
                defaultValue={currentsessionDetails.added_seats}
                onChange={(e) => setAddedSeats(e.target.value)}
                fullWidth
                size="medium"
                helperText="Extra seats to add above the default capacity."
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button variant="contained" size="large" type="submit" sx={{ px: 4 }}>
                  Save Capacity
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
