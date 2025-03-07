import { app_get,app_post } from '../../components/logic/app.js';
import { get_localstorage, set_localstorage } from '../../components/logic/localstorage.js';
import { get_user_and_jwt } from '../../components/logic/users.js';
import { app_api_get } from '../../components/logic/apis';

function get_shift() {
	return app_get('shift/',{});
}


function square_start_shift() {
	
}

function set_shift_fun(payload) {
	console.log(payload)
	return app_post('shift/', {
		payload
	}).then((response) => {
		console.log(response);
	})
}

function get_catalog() {
	return app_api_get('square/',{
		request_type: 'get',
		url: '/catalog/list',
		payload:{},
	}).then((response) => {
		console.log(response, ' catalog');
		return response;
	})
}
export { get_shift, set_shift_fun, get_catalog };