import { FormControl, InputLabel, MenuItem, Typography, Paper } from '@mui/material';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import { useState, useEffect } from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import PasswordDialog from '../../components/ui/password_dialog';

// Dates before today are locked behind this password
const PAST_DATE_PASSWORD = 'gCaV@2026';

export default function HomeInput({ date, setDate, allProducts, selectedProduct, setSelectedProduct }) {
  const [selectedProductId, setSelectedProductId] = useState();
  // Past date the user picked that is waiting for password confirmation
  const [pendingPastDate, setPendingPastDate] = useState(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  var today = new Date();
  var todayDate =
    today.getFullYear() +
    '-' +
    (today.getMonth() + 1).toString().padStart(2, '0') +
    '-' +
    today.getDate().toString().padStart(2, '0');

  useEffect(() => {
    if (setDate && todayDate) {
      setDate(todayDate || '');
    }
  }, [setDate, todayDate]);

  function get_selected_product(e) {
    const selectedProductId = e.target.value;
    const productDetails = allProducts.find((item) => item.id === selectedProductId);
    setSelectedProductId(productDetails.id);
    setSelectedProduct(productDetails);
  }

  function handleDateChange(newValue) {
    if (!newValue || !newValue.isValid()) return;
    const formatted = newValue.format('YYYY-MM-DD');
    if (newValue.isBefore(dayjs(), 'day')) {
      // Don't apply the date yet - ask for the password first
      setPendingPastDate(formatted);
      setPasswordDialogOpen(true);
    } else {
      setDate(formatted);
    }
  }

  function unlockPastDate() {
    setDate(pendingPastDate);
    setPasswordDialogOpen(false);
  }

  // Parse the string date (or Date object) into a dayjs value for the picker
  const dayjsValue = date ? dayjs(date) : dayjs();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid var(--gc-border2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          color: 'text.secondary',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontSize: '0.75rem',
        }}
      >
        Filters
      </Typography>

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label="Date"
          value={dayjsValue}
          onChange={handleDateChange}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          )}
          PaperProps={{
            sx: {
              mt: 0.5,
              borderRadius: 3,
              border: '1px solid var(--gc-border2)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
              overflow: 'hidden',

              /* ── Calendar header ───────────────────── */
              '& .MuiPickersCalendarHeader-root': {
                px: 2,
                pt: 1.5,
                pb: 1,
              },
              '& .MuiPickersCalendarHeader-label': {
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--gc-navy)',
              },
              '& .MuiPickersArrowSwitcher-button': {
                color: 'var(--gc-blue)',
              },

              /* ── Week-day row ──────────────────────── */
              '& .MuiDayPicker-header': {
                px: 1,
              },
              '& .MuiDayPicker-weekDayLabel': {
                fontWeight: 700,
                fontSize: '0.75rem',
                color: 'text.disabled',
              },

              /* ── Day cells ─────────────────────────── */
              '& .MuiPickersDay-root': {
                borderRadius: '50%',
                fontWeight: 500,
                fontSize: '0.82rem',
                transition: 'all 0.15s ease',
                '&:hover:not(.Mui-selected)': {
                  backgroundColor: 'rgba(var(--gc-blue-rgb), 0.1)',
                  color: 'var(--gc-blue)',
                },
              },
              '& .MuiPickersDay-today:not(.Mui-selected)': {
                border: '2px solid var(--gc-blue)',
                color: 'var(--gc-blue)',
                fontWeight: 700,
              },
              '& .MuiPickersDay-root.Mui-selected': {
                backgroundColor: 'var(--gc-blue) !important',
                color: '#ffffff !important',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(var(--gc-blue-rgb), 0.4)',
                '&:hover': {
                  backgroundColor: 'var(--gc-blue-dark) !important',
                },
              },

              /* ── Month/year view ───────────────────── */
              '& .MuiYearPicker-root .PrivatePickersYear-yearButton.Mui-selected': {
                backgroundColor: 'var(--gc-blue)',
                borderRadius: 2,
              },
            },
          }}
        />
      </LocalizationProvider>

      <FormControl fullWidth size="small">
        <InputLabel id="session-type-label">Session Type</InputLabel>
        <Select
          value={selectedProductId ?? allProducts?.[0]?.id ?? ''}
          labelId="session-type-label"
          label="Session Type"
          onChange={get_selected_product}
          sx={{ borderRadius: 2 }}
        >
          {allProducts?.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.nick_name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <PasswordDialog
        open={passwordDialogOpen}
        title="Past Date Locked"
        message={`Viewing sessions for ${
          pendingPastDate ? dayjs(pendingPastDate).format('DD MMM YYYY') : 'a past date'
        } requires a password.`}
        password={PAST_DATE_PASSWORD}
        onSuccess={unlockPastDate}
        onCancel={() => setPasswordDialogOpen(false)}
      />
    </Paper>
  );
}
