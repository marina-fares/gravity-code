import './App.css';
import {  Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import NavBar from './components/ui/navbar';
import { Container } from '@mui/system';
import { get_user_and_jwt } from './components/logic/users';
import Home from './apps/home';
import Login from './apps/login';
import Booking from './apps/booking';
import OneOldBooking from './apps/old_bookings/one_old_booking';
import StartShift from './apps/start_shift';
import EndShit from './apps/end_shift';
import Inventory from './apps/Enventory'; // Typo exists but keeping as per your code
import Options from './apps/Options';
import OldBookingsFun from './apps/refund_booking';
import OldShift from './apps/old_shift';
import OneOldShift from './apps/old_shift/one_shift';
import SquareBook from './apps/refund_booking/one_square_booking';
import EndSubShit from './apps/end_sub_shift';
import OldBookings from './apps/old_bookings'
function App() {
	const [user, set_user] = useState(get_user_and_jwt().user);
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		const storageListener = (e) => {
			if (e.key === 'USER_KEY') {
				set_user(get_user_and_jwt().user);
			}
		};

		window.addEventListener('storage', storageListener);
		return () => window.removeEventListener('storage', storageListener);
	}, []);

	useEffect(() => {
		if (!user) {
			navigate('/login');
		} else if (location.pathname === '/login') {
			navigate('/');
		}
	}, [user, location.pathname, navigate]);

	return (
		<div className="App">
				{user && <NavBar />}
				<Container maxWidth="xl">
					<Routes>
						{user && user.is_staff && (
							<>
								<Route path="/end-shift" element={<EndShit />} />
								<Route path="/end_sub_shift" element={<EndSubShit />} />
								<Route path="/inventory" element={<Inventory />} />
								<Route path="/options" element={<Options />} />
								<Route path="/home" element={<Home />} />
								<Route path="/oldbookingsfun" element={<OldBookingsFun />} />
								<Route path="/oldbookings/:session_id" element={<OldBookings />} />
								<Route path="/book/:session_id" element={<Booking />} />
								<Route path="/booking/:booking_id" element={<OneOldBooking />} />
								<Route path="/square_booking/:square_order_id" element={<SquareBook />} />
							</>
						)}
						{user ? (
							<>
								<Route path="/" element={<StartShift />} />
								<Route path="/old_shift" element={<OldShift />} />
								<Route path="/one_old_shift" element={<OneOldShift />} />
							</>
						) : (
							<>
								<Route path="*" element={<Navigate to="/login" replace />} />
							</>
						)}
						<Route path="/login" element={<Login />} />
					</Routes>
				</Container>

		</div>
	);
}

export default App;
