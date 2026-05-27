import { Button, TextField, Typography, Box, Paper } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { login } from '../../components/logic/users';
import LoadingFun from '../../components/ui/loading';
import AlertFun from '../../components/ui/alert';
import logo from '../../gravity.png';

// ── Branded dots decoration ──────────────────────────────────
const BrandDots = ({ light = false }) => (
  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: light ? 'rgba(247,148,29,0.85)' : 'warning.main' }} />
    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: light ? 'rgba(255,255,255,0.45)' : 'rgba(0,174,239,0.35)' }} />
    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: light ? 'rgba(233,30,140,0.85)' : 'error.main' }} />
  </Box>
);

function SignIn() {
  const navigate = useNavigate();
  const [loading, set_loading] = useState(false);
  const [alert, set_alert] = useState(false);
  const [error_message, set_error_message] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    set_loading(true);
    try {
      await login(data.get('email'), data.get('password'));
      navigate('/');
    } catch (err) {
      set_loading(false);
      set_alert(true);
      console.log('Login error:', err);
      set_error_message(err?.message || 'Login failed. Please try again.');
    } finally {
      set_loading(false);
    }
  };

  return (
    <>
      <LoadingFun open={loading} message="Signing in…" />
      <AlertFun open_alert={alert} set_open_alert={set_alert} message={error_message} setLoading={set_loading} />

      {/* ── Full-viewport overlay — sits above App container padding ── */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #D8EFFA 0%, #EFF8FE 55%, #F5FAFF 100%)',
          zIndex: 1300,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            width: '100%',
            maxWidth: 620,
            mx: 2,
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 20px 64px rgba(27,58,107,0.18), 0 4px 16px rgba(0,174,239,0.10)',
          }}
        >

          {/* ══ LEFT — Brand panel ═══════════════════════════ */}
          <Box
            sx={{
              width: 240,
              flexShrink: 0,
              display: { xs: 'none', sm: 'flex' },
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              background: 'linear-gradient(155deg, #00AEEF 0%, #0098D4 50%, #007BB5 100%)',
              p: 4,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decorative circles */}
            <Box sx={{
              position: 'absolute', top: -50, right: -40,
              width: 140, height: 140, borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.13)',
            }} />
            <Box sx={{
              position: 'absolute', top: 30, right: -15,
              width: 70, height: 70, borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.09)',
            }} />
            <Box sx={{
              position: 'absolute', bottom: -20, left: -30,
              width: 110, height: 110, borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.10)',
            }} />

            {/* GC Logo */}
            <Box
              sx={{
                bgcolor: 'rgba(255,255,255,0.22)',
                borderRadius: 3,
                p: 1.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)',
              }}
            >
              <img
                src={logo}
                alt="Gravity Code"
                style={{ width: 58, height: 58, borderRadius: 10, objectFit: 'contain' }}
              />
            </Box>

            {/* Brand name */}
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1, textAlign: 'center' }}>
              <Box component="span" sx={{ color: 'warning.main' }}>Gravity</Box>
              {' '}
              <Box component="span" sx={{ color: '#ffffff' }}>Code</Box>
            </Typography>

            {/* Subtitle */}
            <Typography
              variant="body2"
              sx={{ color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 1.55, fontSize: '0.82rem' }}
            >
              Staff Booking<br />Management System
            </Typography>

            <BrandDots light />
          </Box>

          {/* ══ RIGHT — Form panel ═══════════════════════════ */}
          <Box
            sx={{
              flex: 1,
              bgcolor: '#ffffff',
              p: { xs: 3, sm: 4 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'secondary.main', mb: 0.5 }}>
              Sign In
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3.5 }}>
              Enter your credentials to continue
            </Typography>

            <Box component="form" onSubmit={handleSubmit} noValidate>

              {/* Username */}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.09em',
                  display: 'block',
                  mb: 0.75,
                  fontSize: '0.72rem',
                }}
              >
                Username
              </Typography>
              <TextField
                required
                fullWidth
                id="email"
                name="email"
                placeholder="Enter username..."
                autoComplete="email"
                autoFocus
                size="medium"
                sx={{ mb: 2.5 }}
              />

              {/* Password */}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.09em',
                  display: 'block',
                  mb: 0.75,
                  fontSize: '0.72rem',
                }}
              >
                Password
              </Typography>
              <TextField
                required
                fullWidth
                name="password"
                placeholder="••••••••"
                type="password"
                id="password"
                autoComplete="current-password"
                size="medium"
                sx={{ mb: 3.5 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  letterSpacing: '0.02em',
                  mb: 3,
                }}
              >
                Sign In →
              </Button>
            </Box>

            <BrandDots />
          </Box>

        </Paper>
      </Box>
    </>
  );
}

export default SignIn;
