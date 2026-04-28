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
import theme from '../theme';
import { ThemeProvider } from '@mui/material';
import logout from '../logic/logout'
import { useNavigate } from "react-router-dom";
import logo from '../../gravity.png'
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
  let [, set_alert] = React.useState(false)
  let [check_password, ] = React.useState(false)
  let [alert, setAlert] = React.useState(false);
  let [error_message, set_error_message] = React.useState('');
  let [open, setOpen] = React.useState(false);

  useEffect(() => {
    get_shift_data()
	}, []);

  function get_shift_data (){
    let shit_data = get_shift();
		shit_data.then((x) => {
      console.log("xxxxxxxxxxxxxxxxxxxxxxxx", x)
      if(x.status == 200)
      {
			  set_shift(x);
      }
      else{
        setAlert(true);
        set_error_message(x.error)
      }
		});
  }

  const navigate = useNavigate();
  
  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = (e) => {

        if(e.currentTarget.id === "Bookings History")
        {
          navigate('/bookings_history')
        }
        if(e.currentTarget.id === "Available Sessions")
        {
          navigate('/home')
        }
        if(e.currentTarget.id === "Inventory")
        {
          navigate('/inventory')
        }
        if(e.currentTarget.id === "Options")
        {
          navigate('/options')
        }
        if(e.currentTarget.id === "Shifts History")
        {
          navigate('/old_shift')
        }

    
      setAnchorElNav(null);
  };

  const handleCloseUserMenu = (element) => {

    if(element.currentTarget.id === 'Logout')
    {
      
      logout()
    }
    else if(element.currentTarget.id === 'End Shift')
    {
      if(check_password){
        set_alert(true)
      }
      else{
        set_alert(false)
        navigate('/end_sub_shift')
        
      }
    }
    setAnchorElUser(null);
  };
  

  return (

    <ThemeProvider theme={theme}>
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <AlertFun open_alert={alert} set_open_alert={setAlert} message={error_message} setLoading={setOpen}/>
          <Typography
            variant="h6"
            noWrap
            component="a"
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            <img src={logo} alt="logo" style={{width: '50px', height: '50px'}}/>
          </Typography>

          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: 'block', md: 'none' },
              }}
            >
              {pages.map((page) => (
                <MenuItem key={page} onClick={handleCloseNavMenu} id={page} >
                  <Typography textAlign="center"  >{page}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
          <Typography
            variant="h5"
            noWrap
            component="a"
            href=""
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
                        <img src={logo} alt="logo" style={{width: '50px', height: '50px'}}/>

          </Typography>
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {pages.map((page) => (
              <Button
                key={page}
                id={page}
                onClick={handleCloseNavMenu}
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                {page}
              </Button>
            ))}
          </Box>

          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title={get_user_and_jwt().user.username}>
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar alt={get_user_and_jwt().user.username} src="../../../frontend/public/gravity.png" />
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              {settings.map((setting) => (
                <MenuItem  onClick={handleCloseUserMenu} id={setting} key={setting} >
                  <Typography textAlign="center">{setting}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
    </ ThemeProvider>


  );
};
export default NavBar;