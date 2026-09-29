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
import SessionCapacity from './apps/session_capacity';
import KeyPad from './apps/keypad';
import BookingsHistory from './apps/all_bookings_history';
import RequireShift from './components/ui/require_shift';

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
	}, [location]);






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
				<Container maxWidth="xl" sx={{ pt: 3, pb: 5 }}>
					<Routes>
						{user && user.is_staff && (
							<>
								{/* All operational pages require a live shift (Square shift id +
								    start_time). Without one, RequireShift redirects to "/" (Start
								    Shift), so no bookings can be created against a non-existent shift. */}
								<Route path="/end-shift" element={<RequireShift><EndShit /></RequireShift>} />
								<Route path="/end_sub_shift" element={<RequireShift><EndSubShit /></RequireShift>} />
								<Route path="/inventory" element={<RequireShift><Inventory /></RequireShift>} />
								<Route path="/options" element={<RequireShift><Options /></RequireShift>} />
								<Route path="/home" element={<RequireShift><Home /></RequireShift>} />
								<Route path="/oldbookings/:session_id" element={<RequireShift><OldBookings /></RequireShift>} />
								<Route path="/book/:session_id" element={<RequireShift><Booking /></RequireShift>} />
								<Route path="/booking/:session_id/:booking_id" element={<RequireShift><OneOldBooking /></RequireShift>} />
								<Route path="/block_seats/:session_id" element={<RequireShift><BlockSeats /></RequireShift>} />
								<Route path="/session_capacity/:session_id" element={<RequireShift><SessionCapacity /></RequireShift>} />
								<Route path="/keypad" element={<RequireShift><KeyPad /></RequireShift>} />
								<Route path="/bookings_history" element={<RequireShift><BookingsHistory /></RequireShift>} />

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
