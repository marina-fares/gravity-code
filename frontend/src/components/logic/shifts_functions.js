import { app_post } from './app.js';
import { set_localstorage } from './localstorage.js';
import { app_api_get, app_api_post } from './apis';
import { set_shift, set_sub_shift } from './shifts_functions_apis.js';

async function end_shift(shift, sub_shift) {
	let date = new Date().toISOString();
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
		set_shift(shift);
		set_sub_shift(sub_shift)

		
	}
);
	window.location.replace("/");
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
		})
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
		let catalog = response
		
		let category_ids = {}
		// catalog = {cat_name: cat_id} 
		let category_items = {}
		

		catalog["objects"].forEach((obj, ind)=>{
		if(obj["type"] === "CATEGORY"){
			category_ids[obj.category_data.name] = obj.id  
			category_items[obj.id] = {}
		}
		})

			
		let item_name = ""
		let item_id = ""
		let item = {}

		catalog["objects"].forEach((obj, ind)=>{
			item = {}
			if(obj["type"] === "ITEM"){
			item_name = obj["item_data"]["name"]
			item_id = obj["item_data"]["variations"][0]["id"]
		

			item[item_name] = item_id 
			let cat_obj = obj["item_data"]["categories"] ? obj["item_data"]["categories"][0]["id"] : obj["item_data"]["category_id"]
			let old_cat = category_items[cat_obj] 
			category_items[cat_obj] =  Object.assign({}, old_cat, item);
				
		}})

		let squareItems = {}
		catalog["objects"].forEach((obj, ind)=>{
			item = {}
			if(obj["type"] === "ITEM"){
			item_name = obj["item_data"]["name"]
			item_id = obj["item_data"]["variations"][0]["id"]
		

			item[item_name] = item_id 
			let cat_obj = obj["item_data"]["categories"] ? obj["item_data"]["categories"][0]["id"] : obj["item_data"]["category_id"]
			let old_cat = category_items[cat_obj] 
			let cat_name = Object.keys(category_ids).find(key => category_ids[key] === cat_obj);
			squareItems[cat_name] =  Object.assign({}, old_cat, item);
				
		}})
		
		set_localstorage("category_ids",JSON.stringify(category_ids))
		set_localstorage("category_items",JSON.stringify(category_items))
		set_localstorage("squareItems",JSON.stringify(squareItems))
		
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

	await set_sub_shift(sub_shift)
	window.location.replace("/");

}


export { end_shift, split_shift, get_catalog };
