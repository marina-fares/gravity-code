import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import logout from '../logic/logout';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../gravity.png';
import { get_user_and_jwt } from '../logic/users';
import { get_shift } from '../logic/shifts_functions_apis';
import { useEffect } from 'react';
import AlertFun from './alert';

const pages = ['Available Sessions', 'Options', 'Inventory', 'Shifts History', 'Bookings History'];
const settings = ['End Shift', 'Logout'];

const NavBar = () => {
  const [anchorElNav, setAnchorElNav] = React.useState(null);
  const [anchorElUser, setAnchorElUser] = React.useState(null);
  let [, set_shift] = React.useState();
  let [, set_alert] = React.useState(false);
  let [check_password,] = React.useState(false);
  let [alert, setAlert] = React.useState(false);
  let [error_message, set_error_message] = React.useState('');
  let [open, setOpen] = React.useState(false);

  useEffect(() => {
    get_shift_data();
  }, []);

  function get_shift_data() {
    let shit_data = get_shift();
    shit_data.then((x) => {
      if (x.status == 200) {
        set_shift(x);
      } else {
        setAlert(true);
        set_error_message(x.error);
      }
    });
  }

  const navigate = useNavigate();
  const location = useLocation();

  // Map each page label to its route path for active detection
  const pageRoutes = {
    'Available Sessions': '/home',
    'Options': '/options',
    'Inventory': '/inventory',
    'Shifts History': '/old_shift',
    'Bookings History': '/bookings_history',
  };

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = (e) => {
    if (e.currentTarget.id === 'Bookings History') navigate('/bookings_history');
    if (e.currentTarget.id === 'Available Sessions') navigate('/home');
    if (e.currentTarget.id === 'Inventory') navigate('/inventory');
    if (e.currentTarget.id === 'Options') navigate('/options');
    if (e.currentTarget.id === 'Shifts History') navigate('/old_shift');
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = (element) => {
    if (element.currentTarget.id === 'Logout') {
      logout();
    } else if (element.currentTarget.id === 'End Shift') {
      if (check_password) {
        set_alert(true);
      } else {
        set_alert(false);
        navigate('/end_sub_shift');
      }
    }
    setAnchorElUser(null);
  };

  const username = get_user_and_jwt().user?.username || '';
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <AppBar position="static">
      <AlertFun open_alert={alert} set_open_alert={setAlert} message={error_message} setLoading={setOpen} />
      <Container maxWidth="xl">
        <Toolbar disableGutters>

          {/* ── Logo + Brand (desktop) ─────────────────────── */}
          <Box
            component="a"
            href="/"
            sx={{
              mr: 3,
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 1.5,
              textDecoration: 'none',
            }}
          >
            <img
              src={logo}
              alt="Gravity Code"
              style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'contain' }}
            />
            <Box sx={{ lineHeight: 1 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, lineHeight: 1, letterSpacing: '0.02em' }}
              >
                <Box component="span" sx={{ color: 'primary.main' }}>Gravity</Box>
                {' '}
                <Box component="span" sx={{ color: 'secondary.main' }}>Code</Box>
              </Typography>
            </Box>
          </Box>

          {/* ── Hamburger menu (mobile) ────────────────────── */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="navigation menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              sx={{ color: 'text.secondary' }}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{ display: { xs: 'block', md: 'none' } }}
            >
              {pages.map((page) => (
                <MenuItem key={page} onClick={handleCloseNavMenu} id={page}>
                  <Typography textAlign="center" sx={{ fontWeight: 500 }}>{page}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* ── Logo (mobile) ──────────────────────────────── */}
          <Box
            component="a"
            href="/"
            sx={{
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              alignItems: 'center',
              gap: 1,
              textDecoration: 'none',
            }}
          >
            <img
              src={logo}
              alt="Gravity Code"
              style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              <Box component="span" sx={{ color: 'primary.main' }}>Gravity</Box>
              {' '}
              <Box component="span" sx={{ color: 'secondary.main' }}>Code</Box>
            </Typography>
          </Box>

          {/* ── Nav links (desktop) ────────────────────────── */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 0.5 }}>
            {pages.map((page) => {
              const isActive = location.pathname === pageRoutes[page] ||
                (page === 'Available Sessions' && location.pathname === '/');
              return (
                <Button
                  key={page}
                  id={page}
                  onClick={handleCloseNavMenu}
                  sx={{
                    color: isActive ? '#ffffff' : 'text.secondary',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.85rem',
                    px: 2,
                    py: 0.75,
                    borderRadius: 50,
                    backgroundColor: isActive ? 'primary.main' : 'transparent',
                    textTransform: 'none',
                    '&:hover': {
                      color: isActive ? '#ffffff' : 'secondary.main',
                      backgroundColor: isActive
                        ? 'primary.dark'
                        : 'rgba(var(--gc-blue-rgb), 0.08)',
                    },
                  }}
                >
                  {page}
                </Button>
              );
            })}
          </Box>

          {/* ── User avatar / menu ─────────────────────────── */}
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title={username} arrow>
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0.5 }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    bgcolor: 'warning.main',
                    color: '#ffffff',
                    border: '2px solid var(--gc-border)',
                  }}
                >
                  {initials}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '48px' }}
              id="menu-appbar-user"
              anchorEl={anchorElUser}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <Box sx={{ px: 2, py: 1, mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Signed in as
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                  {username}
                </Typography>
              </Box>
              <Divider sx={{ mb: 0.5 }} />
              {settings.map((setting) => (
                <MenuItem onClick={handleCloseUserMenu} id={setting} key={setting}>
                  <Typography textAlign="center" sx={{ fontWeight: 500 }}>{setting}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>

        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default NavBar;
