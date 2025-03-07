import { app_get,app_post } from '../../components/logic/app.js';
import { get_localstorage, set_localstorage } from '../../components/logic/localstorage.js';
import { get_user_and_jwt } from '../../components/logic/users.js';

function get_shift() {
	return app_get('shift/',{});
}

function set_shift_fun(payload) {
	console.log(payload)
	return app_post('shift/', {
		payload
	}).then((response) => {
		console.log(response);
	})
		
}

export { get_shift, set_shift_fun };