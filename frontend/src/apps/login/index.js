import { Button, TextField, Typography, Container, Box, Paper } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { login } from '../../components/logic/users';
import LoadingFun from '../../components/ui/loading';
import AlertFun from '../../components/ui/alert';
import logo from '../../gravity.png';

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

      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            mt: { xs: 6, sm: 10 },
            mb: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: '0 12px 48px rgba(var(--gc-navy-rgb), 0.18)',
              border: '1px solid var(--gc-border2)',
            }}
          >
            {/* ── Blue gradient header ───────────────────── */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, var(--gc-navy) 0%, var(--gc-blue-dark) 65%, var(--gc-blue) 100%)',
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <img
                src={logo}
                alt="Gravity Code"
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 14,
                  objectFit: 'contain',
                  background: 'rgba(255,255,255,0.15)',
                  padding: 6,
                }}
              />
              <Typography
                component="h1"
                variant="h5"
                sx={{ fontWeight: 700, color: '#ffffff', letterSpacing: '0.01em' }}
              >
                Welcome Back
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.80)', mt: -0.5 }}
              >
                Sign in to Gravity Code
              </Typography>
            </Box>

            {/* ── Form section ──────────────────────────── */}
            <Box sx={{ p: { xs: 3, sm: 4 } }}>
              <Box component="form" onSubmit={handleSubmit} noValidate>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Username"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  size="medium"
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  size="medium"
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mt: 3, mb: 1, py: 1.4, fontSize: '1rem', letterSpacing: '0.03em' }}
                >
                  Sign In
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>
    </>
  );
}

export default SignIn;
