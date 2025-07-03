import { app_get,app_post } from '../../components/logic/app.js';

function get_shift() {
	return app_get('shift/',{});
}

function set_shift_fun(payload) {
	return app_post('shift/', {
		payload
	}).then((response) => {
		console.log(response);
	})
		
}

export { get_shift, set_shift_fun };