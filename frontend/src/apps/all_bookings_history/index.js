import * as React from 'react';
import TextField from '@mui/material/TextField';
import { useState, useEffect, useRef } from 'react';
import { Typography, Box, Paper, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { get_old_bookings } from './functioncs_api';
import List from '../session_bookings_history/List';

export default function BookingsHistory() {
  const [inputText, setInputText] = React.useState('');
  let [bookingDetails, setBookingDetails] = useState();
  const latestRequestId = useRef(0);

  useEffect(() => {
    if (!inputText) {
      setBookingDetails(undefined);
      return;
    }
    const requestId = ++latestRequestId.current;
    const fetchData = async () => {
      const response = await get_old_bookings({ search_field: inputText });
      if (requestId === latestRequestId.current) {
        setBookingDetails(response);
      }
    };
    fetchData();
  }, [inputText]);

  let inputHandler = (e) => {
    setInputText(e.target.value);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* ── Header ───────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'secondary.main', mb: 0.5 }}>
          Bookings History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Search by customer name, receipt number, or booking reference.
        </Typography>
      </Box>

      {/* ── Search ───────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid var(--gc-border2)', mb: 3 }}>
        <TextField
          onChange={inputHandler}
          variant="outlined"
          fullWidth
          size="medium"
          placeholder="Search bookings…"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* ── Results ──────────────────────────────────── */}
      {!inputText && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <SearchIcon sx={{ fontSize: 48, color: 'var(--gc-border)', mb: 1 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Enter a search term to find bookings.
          </Typography>
        </Box>
      )}

      {inputText && !bookingDetails && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Searching…
          </Typography>
        </Box>
      )}

      {bookingDetails && bookingDetails.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            No bookings found for "{inputText}".
          </Typography>
        </Box>
      )}

      <List bookings={bookingDetails} />
    </Box>
  );
}
