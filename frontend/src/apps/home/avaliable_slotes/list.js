import { Fragment } from 'react';
import { Button, Box, Typography, Chip, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import EventSeatOutlinedIcon from '@mui/icons-material/EventSeatOutlined';
import { useNavigate } from 'react-router-dom';
import { set_localstorage } from '../../../components/logic/localstorage';

export default function List({ date, availableSessions, selectedProduct }) {
  const navigate = useNavigate();

  function list_old_bookings(session_id) {
    set_localstorage('date', date);
    set_localstorage('session_type', selectedProduct);
    navigate(`/oldbookings/${session_id}`);
  }

  if (!availableSessions || availableSessions.length === 0) {
    return (
      <Box
        sx={{
          mt: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
          p: 5,
          borderRadius: 3,
          border: '2px dashed var(--gc-border)',
          background: 'rgba(var(--gc-blue-rgb), 0.02)',
        }}
      >
        <EventSeatOutlinedIcon sx={{ fontSize: 48, color: 'var(--gc-border)' }} />
        <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          No sessions available
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          There are no sessions for the selected date and product type.
        </Typography>
      </Box>
    );
  }

  return (
    <Fragment>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {availableSessions.map((item) => {
          const datetime = new Date(item.start_time);
          const timeStr =
            String((datetime.getHours() % 12) || 12).padStart(2, '0') +
            ':' +
            String(datetime.getMinutes()).padStart(2, '0') +
            ' ' +
            (datetime.getHours() >= 12 ? 'PM' : 'AM');
          const dateStr =
            datetime.getFullYear() +
            '-' +
            String(datetime.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(datetime.getDate()).padStart(2, '0');

          const seatColor =
            item.available_seats === 0
              ? 'error'
              : item.available_seats <= 3
              ? 'warning'
              : 'success';

          return (
            <Paper
              key={item.id}
              elevation={0}
              onClick={() => list_old_bookings(item.id)}
              sx={{
                borderRadius: 3,
                border: '1px solid var(--gc-border2)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 6px 24px rgba(var(--gc-blue-rgb), 0.15)',
                  borderColor: 'primary.main',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {/* ── Card Header ──────────────────────────── */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  background: 'linear-gradient(135deg, var(--gc-bg) 0%, var(--gc-bg2) 100%)',
                  borderBottom: '1px solid var(--gc-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                {/* Session label */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                    {item.product.nick_name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {dateStr} · {timeStr}
                  </Typography>
                </Box>

                {/* Action buttons */}
                <Box
                  sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/book/${item.id}`);
                    }}
                    sx={{ px: 2, fontSize: '0.8rem' }}
                  >
                    Book
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PeopleAltOutlinedIcon sx={{ fontSize: 14 }} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/session_capacity/${item.id}`);
                    }}
                    sx={{ px: 1.5, fontSize: '0.8rem' }}
                  >
                    Capacity
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="warning"
                    startIcon={<BlockIcon sx={{ fontSize: 14 }} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/block_seats/${item.id}`);
                    }}
                    sx={{ px: 1.5, fontSize: '0.8rem' }}
                  >
                    Block
                  </Button>
                </Box>
              </Box>

              {/* ── Card Body ────────────────────────────── */}
              <Box sx={{ px: 2.5, py: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip
                  icon={<EventSeatOutlinedIcon sx={{ fontSize: '1rem !important' }} />}
                  label={`${item.available_seats} seats available`}
                  color={seatColor}
                  size="small"
                  variant="filled"
                />
                {item.block_seats_obj?.number > 0 && (
                  <Chip
                    label={`${item.block_seats_obj.number} blocked — ${item.block_seats_obj.note}`}
                    color="warning"
                    size="small"
                    variant="outlined"
                  />
                )}
                {item.added_seats > 0 && (
                  <Chip
                    label={`+${item.added_seats} added`}
                    color="primary"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Fragment>
  );
}
