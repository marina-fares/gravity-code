import { Button, TextField, Typography, Box, Paper } from '@mui/material';
import { useState, useEffect } from 'react';
import { app_put } from '../components/logic/app';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingFun from '../components/ui/loading';
import AlertFun from '../components/ui/alert';
import { get_session_details } from './booking/functions_apis';
import BlockIcon from '@mui/icons-material/Block';

export default function BlockSeats() {
  const navigate = useNavigate();
  let { session_id } = useParams();
  let [isLoading, setIsLoading] = useState();
  let [currentsessionDetails, setCurrentSessionDetails] = useState();
  let [blockSeats, setBlockSeats] = useState({});
  let [alert, setAlert] = useState(false);
  let [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const sessionData = await get_session_details(session_id);
      if (sessionData.status === 200) {
        const currentSessionData = sessionData.data.find((session) => session.id == session_id);
        setCurrentSessionDetails(currentSessionData);
        setBlockSeats(currentSessionData.block_seats_obj);
      } else {
        setAlert(true);
        setAlertMessage(sessionData.error);
      }
    };
    fetchData();
  }, [session_id]);

  const block_seats = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (
        blockSeats.number === '' ||
        blockSeats.number === null ||
        blockSeats.number === undefined ||
        isNaN(Number(blockSeats.number))
      ) {
        throw new Error('Invalid number of seats');
      }
      const currentSession = {
        ...currentsessionDetails,
        block_seats_obj: blockSeats,
        block_seats: blockSeats.number,
        product: currentsessionDetails.product.id,
      };
      await app_put(`session/${session_id}/`, {}, currentSession);
      navigate('/');
    } catch (error) {
      setAlert(true);
      setAlertMessage(`Error blocking seats: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', mt: 4 }}>
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
              gap: 1.5,
            }}
          >
            <BlockIcon sx={{ color: 'warning.main', fontSize: 22 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.main', lineHeight: 1.2 }}>
                Block Seats
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Session: {currentsessionDetails.product?.nick_name}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 3 }}>
            <Box
              component="form"
              onSubmit={block_seats}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <TextField
                required
                label="Block Note"
                onChange={(e) =>
                  setBlockSeats((prev) => ({ ...prev, note: e.target.value }))
                }
                value={blockSeats?.note === 'none' ? '' : blockSeats?.note || ''}
                fullWidth
                size="medium"
              />
              <TextField
                required
                label="Number of Seats to Block"
                type="number"
                onChange={(e) =>
                  setBlockSeats((prev) => ({ ...prev, number: Number(e.target.value) }))
                }
                value={blockSeats?.number || ''}
                fullWidth
                size="medium"
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button variant="contained" color="warning" size="large" type="submit" sx={{ px: 4 }}>
                  Save Blocks
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
