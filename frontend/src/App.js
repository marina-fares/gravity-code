import logo from './logo.svg';
import './App.css';
import Button from '@mui/material/Button';
import NavBar from './components/ui/navbar';
import {BrowserRouter as Router,Switch,Route,Routes,Link, useLocation} from "react-router-dom";
import Login from './apps/login';
import { Container } from '@mui/system';
import { get_user_and_jwt } from './components/logic/users';
import history from './components/logic/history';
import Home from './apps/home';
import { useEffect, useState } from 'react';

import { useNavigate } from "react-router-dom";
import Booking from './apps/booking';
import OneOldBooking from './apps/home/refund_booking/one_old_booking'
import StartShift from './apps/start_shift';
import EndShit from './apps/end_shift';
 
import Inventory from './apps/Enventory';
import Options from './apps/Options';
import OldBookings from './apps/home/refund_booking';
import OldShift from './apps/old_shift';
import OneOldShift from './apps/old_shift/one_shift'
import SquareBook from './apps/home/refund_booking/one_square_booking';
import { get_shift } from './apps/Enventory/shifts_functions';
import EndSubShit from './apps/end_sub_shift';
function App() {
let [user, set_user] = useState(get_user_and_jwt().user);
let [shift, set_shift] = useState(null);

const navigate = useNavigate();

window.addEventListener('storage', (e) => {
  if (e.key === 'USER_KEY') {
    set_user(get_user_and_jwt().user);
  }
  if(e.key === 'shift'){
    set_shift(JSON.parse(localStorage.getItem('shift')))
  }
});
  
useEffect(() => {
  if (!user) {
    navigate('/login');
  }
  else {
    if (window.location.pathname === '/login') {
      navigate('');
    }
  }
}, [user]);

useEffect(() => {
  let shit_data = get_shift();
  shit_data.then((x) => {
    set_shift(x);
    console.log(x)
    console.log(user)
  });
}, []);


const location = useLocation();
  return (
    <div className="App">
     {user  && <NavBar />}
      <Container maxWidth="xl">
        <Routes>
        {user && user.is_staff && 
          <Route>       
          <Route exact path='end-shift' element={< EndShit />}></Route>
          <Route exact path='end_sub_shift' element={< EndSubShit />}></Route>
          <Route exact path='/inventory' element={< Inventory />}></Route>
          <Route exact path='/options' element={< Options />}></Route>
          <Route exact path='home' element={< Home />}></Route>
          <Route exact path='/oldbookings' element={< OldBookings />}></Route>   
          <Route exact path='/book/:event_id' element={< Booking />}></Route> 
          <Route exact path='/booking/:booking_id' element={< OneOldBooking  />}></Route> 
          <Route exact path='/square_booking/:square_order_id' element={< SquareBook />}></Route> 
          </Route> 
        }  
          <Route exact path='' element={< StartShift />}></Route>
          <Route exact path='/old_shift' element={< OldShift />}></Route>
          <Route exact path='/one_old_shift' element={< OneOldShift />}></Route>
          <Route exact path='/login' element={< Login />}></Route>      
        </Routes>
      </Container>
    </div>
  );
}

export default App;
