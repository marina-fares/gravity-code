import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { get_shift } from '../logic/shifts_functions_apis';

/**
 * Route guard: blocks any operational page (bookings, home, options, inventory,
 * end-shift, …) unless the current user has a live shift — i.e. the backend
 * profile has a Square shift id (current_shift_id) AND a start_time AND no
 * end_time. Otherwise it redirects to the Start Shift page ("/").
 *
 * This is the single enforcement point: without an active shift a user can no
 * longer reach the booking page (so no bookings can be created against a
 * non-existent shift), and opening any protected page bounces them to start one.
 */
export default function RequireShift({ children }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'no_shift'

  useEffect(() => {
    let active = true;
    get_shift()
      .then((res) => {
        if (!active) return;
        const d = res?.data;
        const hasActiveShift =
          res?.status === 200 &&
          d &&
          d.current_shift_id &&
          d.start_time &&
          !d.end_time;
        setStatus(hasActiveShift ? 'ok' : 'no_shift');
      })
      .catch(() => {
        if (active) setStatus('no_shift');
      });
    return () => {
      active = false;
    };
  }, []);

  if (status === 'loading') {
    return (
      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Checking your shift…
        </Typography>
      </Box>
    );
  }

  if (status === 'no_shift') {
    return <Navigate to="/" replace />;
  }

  return children;
}
