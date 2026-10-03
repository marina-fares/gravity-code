import { app_get, app_post } from './app';
import { app_api_get } from './apis';

async function get_shift() {
    const res = await app_get('shift/');
	return res;
}

async function get_sub_shift() {
	const shift_details = await app_get('sub_shift/', {});
	return shift_details;

}

async function get_current_group() {
	const current_group = await app_get('current_group/', {});
	return current_group;
}


function set_shift(payload) {
	return app_post('shift/', {
		payload
	})
}

function set_sub_shift(payload) {

	return app_post('sub_shift/', {
		payload
	});
}

// Fields that identify / drive the lifecycle of the active shift. ONLY the
// start-shift and end-shift flows may write these. Money / inventory / note /
// refund writes (bookings, refunds, the Options page) re-post their whole copy
// of the profile — which is often stale — so if they sent these fields they
// could clobber a live shift's current_shift_id / start_time back to null,
// making the Square shift id "disappear" from the backend. Strip them.
const SHIFT_IDENTITY_FIELDS = ['current_shift_id', 'start_time', 'end_time'];

function _strip_identity(payload) {
	const clean = { ...payload };
	SHIFT_IDENTITY_FIELDS.forEach((f) => delete clean[f]);
	return clean;
}

// Use these from booking / refund / options writes instead of set_shift /
// set_sub_shift so they can only update money, inventory and notes — never the
// shift-identity fields.
function set_shift_money(payload) {
	return set_shift(_strip_identity(payload));
}

function set_sub_shift_money(payload) {
	return set_sub_shift(_strip_identity(payload));
}

async function get_catalog() {
	await app_api_get('square/',{
		request_type: 'get',
		url: '/catalog/list',
		payload:{},
	}).then((response) => {
		return response;
	})
}


export { get_shift, get_sub_shift, set_shift, set_sub_shift, set_shift_money, set_sub_shift_money, get_catalog, get_current_group };