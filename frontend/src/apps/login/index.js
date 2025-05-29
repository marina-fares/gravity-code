import { Avatar, Button, CssBaseline, TextField, Typography, Container, Box } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { ThemeProvider } from '@mui/material/styles';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { login } from '../../components/logic/users';
import theme from '../../components/theme';
import LoadingFun from '../../components/ui/loading';
import AlertFun from '../../components/ui/alert';

function SignIn() {

    const navigate = useNavigate()

    const [ loading, set_loading ] = useState(false)
    const [ alert, set_alert ] = useState(false)
    const [ error_message, set_error_message ] = useState('')

const handleSubmit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    set_loading(true);

    try {
        await login(data.get('email'), data.get('password'));
        navigate('/')

    } catch (err) {
        set_loading(false)
        set_alert(true)
        set_error_message('Invalid email or password. Please try again.');
    } finally {
        set_loading(false);
    }
};

  return (
    <ThemeProvider theme={theme}>
        <LoadingFun open={loading} message='Sign in'/>
        <AlertFun open_alert={alert} set_open_alert={set_alert} message={error_message} /> 
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <Box
            sx={{
                marginTop: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
            >
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
                Sign in
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
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
                />
                <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                Sign In
                </Button>
            </Box>
            </Box>
        </Container>
    </ThemeProvider>
  );
}

export default SignIn;
