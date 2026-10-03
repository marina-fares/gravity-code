import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Typography, Box } from '@mui/material';
import { get_old_bookings_for_spesific_session } from '../../components/logic/booking_functions';
import List from './List';

export default function OldBookings() {
  const searchParams = useParams();
  const sessionId = searchParams.session_id;
  const [bookings, setBookings] = React.useState();

  useEffect(() => {
    if (sessionId) {
      fetchData(sessionId);
    }
  }, [sessionId]);

  const fetchData = async (sessionId) => {
    const bookingsData = await get_old_bookings_for_spesific_session(sessionId);
    setBookings(bookingsData.data);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'secondary.main', mb: 0.5 }}>
          Session Bookings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          All completed bookings for this session.
        </Typography>
      </Box>
      <List bookings={bookings} />
    </Box>
  );
}
