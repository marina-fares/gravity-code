import { app_get, app_post } from './app';

async function get_product() {
	const productsDetails = await app_get('products/', {});
	return productsDetails;
}

async function get_available_sessions(payload) {
	const  availableSessions = await app_post('sessions/', {payload});
	return availableSessions;
}

async function get_old_bookings_for_spesific_session(session_id)
{
	const oldBookingsData = await app_get(`bookings/${session_id}/`, {});
	return oldBookingsData
}

async function get_booking_details(booking_id)
{
	const oldBookingsData = await app_get(`booking/${booking_id}/`, {});
	console.log(oldBookingsData)	
	return oldBookingsData
}


export { get_product, get_available_sessions, get_old_bookings_for_spesific_session, get_booking_details };