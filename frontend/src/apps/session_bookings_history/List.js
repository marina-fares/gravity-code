import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Chip } from '@mui/material';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';

export default function List({ bookings }) {
  const navigate = useNavigate();

  function openbooking(item) {
    navigate(`/booking/${item.session}/${item.id}/`);
  }

  if (!bookings || bookings.length === 0) {
    return (
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
        <ReceiptLongOutlinedIcon sx={{ fontSize: 48, color: 'var(--gc-border)', mb: 1 }} />
        <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          No bookings found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {bookings.map((item) => {
        const datetime = new Date(item.created_at);
        const timeStr =
          datetime.getFullYear() +
          '-' +
          String(datetime.getMonth() + 1).padStart(2, '0') +
          '-' +
          String(datetime.getDate()).padStart(2, '0') +
          ' ' +
          String((datetime.getHours() % 12) || 12).padStart(2, '0') +
          ':' +
          String(datetime.getMinutes()).padStart(2, '0') +
          ' ' +
          (datetime.getHours() >= 12 ? 'PM' : 'AM');

        const isRefunded = item.status === 'refunded';

        return (
          <Paper
            key={item.id}
            elevation={0}
            onClick={() => openbooking(item)}
            sx={{
              borderRadius: 2.5,
              border: isRefunded
                ? '1px solid rgba(var(--gc-pink-rgb), 0.25)'
                : '1px solid var(--gc-border2)',
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
            {/* Header row */}
            <Box
              sx={{
                px: 2.5,
                py: 1.25,
                background: isRefunded
                  ? 'rgba(var(--gc-pink-rgb), 0.04)'
                  : 'linear-gradient(135deg, var(--gc-bg) 0%, var(--gc-bg2) 100%)',
                borderBottom: '1px solid var(--gc-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                {timeStr}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {item.type_of_players}
                </Typography>
                {isRefunded && (
                  <Chip label="Refunded" color="error" size="small" />
                )}
              </Box>
            </Box>

            {/* Body */}
            <Box sx={{ px: 2.5, py: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Players
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {item.number_of_players}
                  </Typography>
                </Box>

                {item.options && item.options.filter(o => o.name !== item.type_of_players).map((option, index) => (
                  <Box key={index}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {option.name}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {option.quantity} × {option.total_money.amount / (100 * option.quantity)}
                    </Typography>
                  </Box>
                ))}

                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Receipt
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {item.square_receipt_number}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Total
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                    {item.payment.amount} EGP
                  </Typography>
                </Box>
              </Box>

              {item.note && (
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
                  Note: {item.note}
                </Typography>
              )}
              {item.payment?.promoCode && (
                <Chip
                  label={`Promo: ${item.payment.promoCode}`}
                  color="warning"
                  size="small"
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}
