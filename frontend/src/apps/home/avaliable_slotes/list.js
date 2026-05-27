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

  // ── Detect the current active session ────────────────────
  const now = new Date();
  const todayStr = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
  const isToday = date === todayStr;
  const currentHour = now.getHours();

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
            String((datetime.getHours() % 12) || 12).padStart(2, '0') + ':' +
            String(datetime.getMinutes()).padStart(2, '0') + ' ' +
            (datetime.getHours() >= 12 ? 'PM' : 'AM');
          const dateStr =
            datetime.getFullYear() + '-' +
            String(datetime.getMonth() + 1).padStart(2, '0') + '-' +
            String(datetime.getDate()).padStart(2, '0');

          const seatColor =
            item.available_seats === 0 ? 'error' :
            item.available_seats <= 3 ? 'warning' : 'success';

          const isCurrent = isToday && new Date(item.start_time).getHours() === currentHour;

          return (
            <Paper
              key={item.id}
              elevation={0}
              onClick={() => list_old_bookings(item.id)}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: isCurrent ? 'primary.main' : 'var(--gc-border2)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isCurrent
                  ? 'linear-gradient(135deg, var(--gc-blue) 0%, var(--gc-blue-dark) 100%)'
                  : 'background.paper',
                boxShadow: isCurrent ? '0 8px 28px rgba(var(--gc-blue-rgb), 0.35)' : 'none',
                transform: isCurrent ? 'scale(1.01)' : 'none',
                '&:hover': {
                  boxShadow: isCurrent
                    ? '0 12px 32px rgba(var(--gc-blue-rgb), 0.45)'
                    : '0 6px 24px rgba(var(--gc-blue-rgb), 0.15)',
                  borderColor: 'primary.main',
                  transform: isCurrent ? 'scale(1.01) translateY(-1px)' : 'translateY(-1px)',
                },
              }}
            >
              {/* ── Card Header ──────────────────────────────── */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  background: isCurrent ? 'transparent' : 'linear-gradient(135deg, var(--gc-bg) 0%, var(--gc-bg2) 100%)',
                  borderBottom: `1px solid ${isCurrent ? 'rgba(255,255,255,0.2)' : 'var(--gc-border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                {/* Session label */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isCurrent ? '#ffffff' : 'secondary.main' }}>
                    {item.product.nick_name}
                  </Typography>
                  {isCurrent && (
                    <Chip
                      label="Now"
                      size="small"
                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.25)', color: '#ffffff' }}
                    />
                  )}
                  <Typography variant="body2" sx={{ color: isCurrent ? 'rgba(255,255,255,0.8)' : 'text.secondary' }}>
                    {dateStr} · {timeStr}
                  </Typography>
                </Box>

                {/* Action buttons */}
                <Box
                  sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant={isCurrent ? 'outlined' : 'contained'}
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={(e) => { e.stopPropagation(); navigate(`/book/${item.id}`); }}
                    sx={{
                      px: 2,
                      fontSize: '0.8rem',
                      ...(isCurrent && {
                        color: '#ffffff',
                        borderColor: 'rgba(255,255,255,0.6)',
                        '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.15)' },
                      }),
                    }}
                  >
                    Book
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PeopleAltOutlinedIcon sx={{ fontSize: 14 }} />}
                    onClick={(e) => { e.stopPropagation(); navigate(`/session_capacity/${item.id}`); }}
                    sx={{
                      px: 1.5,
                      fontSize: '0.8rem',
                      ...(isCurrent && {
                        color: '#ffffff',
                        borderColor: 'rgba(255,255,255,0.6)',
                        '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.15)' },
                      }),
                    }}
                  >
                    Capacity
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color={isCurrent ? undefined : 'warning'}
                    startIcon={<BlockIcon sx={{ fontSize: 14 }} />}
                    onClick={(e) => { e.stopPropagation(); navigate(`/block_seats/${item.id}`); }}
                    sx={{
                      px: 1.5,
                      fontSize: '0.8rem',
                      ...(isCurrent && {
                        color: '#ffffff',
                        borderColor: 'rgba(255,255,255,0.6)',
                        '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.15)' },
                      }),
                    }}
                  >
                    Block
                  </Button>
                </Box>
              </Box>

              {/* ── Card Body ────────────────────────────── */}
              <Box sx={{ px: 2.5, py: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip
                  icon={<EventSeatOutlinedIcon sx={{ fontSize: '1rem !important', color: isCurrent ? '#ffffff !important' : undefined }} />}
                  label={`${item.available_seats} seats available`}
                  size="small"
                  variant={isCurrent ? 'outlined' : 'filled'}
                  color={isCurrent ? undefined : seatColor}
                  sx={isCurrent ? { borderColor: 'rgba(255,255,255,0.5)', color: '#ffffff', '& .MuiChip-icon': { color: '#ffffff' } } : {}}
                />
                {item.block_seats_obj?.number > 0 && (
                  <Chip
                    label={`${item.block_seats_obj.number} blocked — ${item.block_seats_obj.note}`}
                    size="small"
                    variant="outlined"
                    sx={isCurrent ? { borderColor: 'rgba(255,255,255,0.5)', color: '#ffffff' } : { color: 'warning.main', borderColor: 'warning.main' }}
                  />
                )}
                {item.added_seats > 0 && (
                  <Chip
                    label={`+${item.added_seats} added`}
                    size="small"
                    variant="outlined"
                    sx={isCurrent ? { borderColor: 'rgba(255,255,255,0.5)', color: '#ffffff' } : { color: 'primary.main', borderColor: 'primary.main' }}
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
