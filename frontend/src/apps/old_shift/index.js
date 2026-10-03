import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TextField, Typography, Box, Paper, Chip } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { app_get } from '../../components/logic/app';
import LoadingFun from '../../components/ui/loading';

export default function OldShift() {
  const [all_shifts, set_all_shifts] = useState([]);
  const [selected_date, set_selected_date] = useState(new Date());
  const [is_loading, set_is_loading] = useState(false);
  const navigate = useNavigate();

  const fetchall_shifts = async () => {
    set_is_loading(true);
    const shifts = await app_get('old_shift/?date=' + selected_date.toLocaleDateString('en-CA'));
    console.log('All shifts', selected_date.toLocaleDateString('en-CA'));
    set_all_shifts(shifts.data || []);
    set_is_loading(false);
  };

  useEffect(() => {
    console.log('Selected date in useEffect', new Date());
    console.log('Selected date in useEffect', selected_date);
    fetchall_shifts();
  }, [selected_date]);

  const filteredShifts = all_shifts.filter((item) => {
    const itemDate = new Date(item.date);
    return (
      itemDate.getDate() === selected_date.getDate() &&
      itemDate.getMonth() === selected_date.getMonth()
    );
  });

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <LoadingFun open={is_loading} message="Loading shift history…" />

      {/* ── Header ───────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'secondary.main', mb: 0.5 }}>
          Shifts History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Browse past shifts by date.
        </Typography>
      </Box>

      {/* ── Date picker ──────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Select Date"
            value={selected_date}
            onChange={(newDate) => {
              set_selected_date(new Date(newDate));
              console.log('selected date', newDate);
            }}
            renderInput={(params) => <TextField {...params} size="small" />}
          />
        </LocalizationProvider>
      </Box>

      {/* ── Results ──────────────────────────────────── */}
      {filteredShifts.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filteredShifts.map((item) => {
            const datetime = new Date(item.json_data.start_time);
            return (
              <Paper
                key={item.date}
                elevation={0}
                onClick={() => navigate('/one_old_shift', { state: item })}
                sx={{
                  borderRadius: 2,
                  border: '1px solid var(--gc-border2)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 4px 16px rgba(var(--gc-blue-rgb), 0.15)',
                    borderColor: 'primary.main',
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <Box
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        bgcolor: 'action.selected',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <HistoryIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {datetime.toLocaleString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric',
                          hour12: true,
                        })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.profile?.username}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip label="View" size="small" color="primary" variant="outlined" />
                </Box>
              </Paper>
            );
          })}
        </Box>
      ) : (
        <Box
          sx={{
            mt: 4,
            p: 5,
            borderRadius: 3,
            border: '2px dashed var(--gc-border)',
            textAlign: 'center',
            background: 'rgba(var(--gc-blue-rgb), 0.02)',
          }}
        >
          <HistoryIcon sx={{ fontSize: 48, color: 'var(--gc-border)', mb: 1 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            No shifts found for this date.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
