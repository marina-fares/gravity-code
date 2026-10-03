import { app_get } from "../../components/logic/app";

async function get_old_bookings({search_field})
{
	const oldBookingsData = await app_get(`bookings/?tt=${search_field}`, {});
	return oldBookingsData.data
}

export {get_old_bookings}