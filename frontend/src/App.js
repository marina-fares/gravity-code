import './App.css';
import {  Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import NavBar from './components/ui/navbar';
import { Container } from '@mui/system';
import { get_user_and_jwt } from './components/logic/users';
import Home from './apps/home';
import Login from './apps/login';
import Booking from './apps/booking';
import OneOldBooking from './apps/session_bookings_history/one_old_booking';
import StartShift from './apps/start_shift';
import EndShit from './apps/end_shift';
import Inventory from './apps/Enventory'; // Typo exists but keeping as per your code
import Options from './apps/Options';
import OldShift from './apps/old_shift';
import OneOldShift from './apps/old_shift/one_shift';
import EndSubShit from './apps/end_sub_shift';
import OldBookings from './apps/session_bookings_history'
import { delete_hold_booking } from './components/logic/booking_functions';
import BlockSeats from './apps/block_seats';
import KeyPad from './apps/keypad';
import BookingsHistory from './apps/all_bookings_history';

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
	const handleBookingCleanup = () => {
		const bookingId = localStorage.getItem('bookingId');
		if (bookingId && bookingId !== 'undefined') {
		delete_hold_booking({ bookingId });
		localStorage.removeItem('bookingId');
		}
	};

	// Handle initial load (refresh)
	handleBookingCleanup();

	// Handle back/forward navigation
	const handlePopState = () => {
		handleBookingCleanup();
	};

	window.addEventListener('popstate', handlePopState);

	return () => {
		window.removeEventListener('popstate', handlePopState);
	};
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
								<Route path="/oldbookings/:session_id" element={<OldBookings />} />
								<Route path="/book/:session_id" element={<Booking />} />
								<Route path="/booking/:session_id/:booking_id" element={<OneOldBooking />} />
								<Route path="/block_seats/:session_id" element={<BlockSeats />} />
								<Route path="/keypad" element={<KeyPad />} />
								<Route path="/bookings_history" element={<BookingsHistory />} />
								
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
