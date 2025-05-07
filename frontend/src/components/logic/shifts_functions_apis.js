import { app_get, app_post } from './app';
import { app_api_get } from './apis';

async function get_shift() {
	const shift_details = await app_get('shift/', {});
	return shift_details;
}

async function get_sub_shift() {
	const shift_details = await app_get('sub_shift/', {});
	return shift_details;
}

function set_shift(payload) {
	return app_post('shift/', payload).then((response) => {
		return response;
	});
}

function set_sub_shift(payload) {

	return app_post('sub_shift/', {
		payload,
	});
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


export { get_shift, get_sub_shift, set_shift, set_sub_shift, get_catalog };