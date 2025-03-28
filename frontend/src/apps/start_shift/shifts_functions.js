import { app_get, app_post } from '../../components/logic/app.js';
import { get_localstorage, set_localstorage } from '../../components/logic/localstorage.js';
import { get_user_and_jwt } from '../../components/logic/users.js';
import { app_api_get, app_api_post } from '../../components/logic/apis';

function get_shift() {
	return app_get('shift/', {});
}

function get_sub_shift() {
	return app_get('sub_shift/', {});
}

function set_shift_fun(payload) {
	console.log(payload);

	return app_post('shift/', {
		payload,
	}).then((response) => {
		console.log(response);
	});
}

function set_sub_shift_fun(payload) {

	return app_post('sub_shift/', {
		payload,
	}).then((response) => {
		console.log(response);
	});
}

async function end_shift(shift, sub_shift) {
	let date = new Date().toISOString();
	console.log("this is the end shift")
	console.log(sub_shift)
	shift.end_time = date
	sub_shift.end_time = date

	await app_post('old_shift/', {"payload": shift})
	await app_post('sub_shift_history/', {"payload": sub_shift})

	await app_api_post('square/', {
		request_type: 'put',
		url: `/labor/shifts/${shift.current_shift_id}`,
		payload: {
			shift: {
				id: shift.current_shift_id,
				start_at: shift.start_time,
				location_id: shift.square_location_id,
				end_at: date,
				team_member_id: shift.square_team_member_id,
				wage: {
					hourly_rate: {
						amount: 0,
						currency: 'EGP',
					},
				},
			},
		},
	}).then((res) => {
		// debugger;
		shift.end_time = null;
		shift.start_time = null;
		shift.current_shift_id = null;
		shift.start_shift_cash = 0;
		shift.refund_cash = 0;
		shift.refund_visa = 0;
		shift.shift_money_cash = 0;
		shift.shift_money_visa = 0;
		shift.actual_cash = 0;
		shift.actual_visa = 0;
		shift.sub_shift_round = 0
		shift.note = {}
		shift.inventory = {}
		shift.options2 = []
		sub_shift.end_time = null;
		sub_shift.start_time = null;
		sub_shift.current_shift_id = null;
		sub_shift.start_shift_cash = 0;
		sub_shift.refund_cash = 0;
		sub_shift.refund_visa = 0;
		sub_shift.shift_money_cash = 0;
		sub_shift.shift_money_visa = 0;
		sub_shift.actual_cash = 0;
		sub_shift.actual_visa = 0;
		sub_shift.note = {}
		set_shift_fun(shift);
		set_sub_shift_fun(sub_shift)
		console.log("shift before end")
		console.log(shift)
		
	}
);
	window.location.replace("/");
	// console.log(win)
}

async function get_zoho_items(){
	let zoho_items = {}
	await app_api_get('zoho/', {
		request_type: 'get',
		url: '/items',
		payload: {},
	}).then((response)=>{
		response.items.forEach((item)=>{
			zoho_items[item.description.split('_')[1]] = [item.item_id, item.rate]
			console.log("-----------108", zoho_items)
		})
		console.log("-----------------110", zoho_items)
		set_localstorage("zoho_items", JSON.stringify(zoho_items))
	})
}
async function get_catalog() {
	get_zoho_items()
	return app_api_get('square/', {
		request_type: 'get',
		url: '/catalog/list',
		payload: {},
	}).then((response) => {
		console.log(response, 'catalog');
		// set_localstorage('catalog', JSON.stringify(response))
		let catalog = response
		
		let category_ids = {}
		// catalog = {cat_name: cat_id} 
		let category_items = {}
		
		// catalog = {cat_name: {item_name: item_id}} 
		

		// let catalog_ids = {}
			catalog["objects"].forEach((obj, ind)=>{
			if(obj["type"] === "CATEGORY"){
				category_ids[obj.category_data.name] = obj.id  
				category_items[obj.id] = {}
			}
			})
			console.log("doneeeeeeeeeeeeeeeeeeeeeeeeeee")
			console.log(category_ids)
			
			let item_name = ""
			let item_id = ""
			let item = {}
			let total_Items = {}

			catalog["objects"].forEach((obj, ind)=>{
				item = {}
				if(obj["type"] === "ITEM"){
				item_name = obj["item_data"]["name"]
				item_id = obj["item_data"]["variations"][0]["id"]
			

				item[item_name] = item_id 
				let old_cat = category_items[obj["item_data"]["categories"][0]["id"]] 
				console.log("------------------156")
				console.log(obj["item_data"])
				category_items[obj["item_data"]["categories"][0]["id"]] =  Object.assign({}, old_cat, item);
					
				}})
		
		
		set_localstorage("category_ids",JSON.stringify(category_ids))
		set_localstorage("category_items",JSON.stringify(category_items))
		console.log(category_ids)
		console.log(category_items)
		
		return response;
	});
}

async function split_shift(shift, sub_shift) {

	let date = new Date().toISOString();

	sub_shift.end_time = date

	await app_post('sub_shift_history/', {"payload": sub_shift})

	sub_shift.end_time = null;
	sub_shift.start_time = shift.start_time;
	sub_shift.start_shift_cash = 0;
	sub_shift.refund_cash = 0;
	sub_shift.refund_visa = 0;
	sub_shift.shift_money_cash = 0;
	sub_shift.shift_money_visa = 0;
	sub_shift.actual_cash = 0;
	sub_shift.actual_visa = 0;
	sub_shift.note = {}

	console.log("this is the split shift 2")
	console.log(sub_shift)
	await set_sub_shift_fun(sub_shift)
	window.location.replace("/");

}


export { get_shift, set_shift_fun, end_shift, split_shift, get_catalog , get_sub_shift, set_sub_shift_fun};
