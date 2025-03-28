import { Button, Grid, InputLabel, TextField } from '@mui/material';
import { Fragment, useEffect, useState } from 'react';

import Card from 'react-bootstrap/Card';
import Input from '@mui/material/Input';
import { Delete, Add } from '@mui/icons-material';
import { get_catalog, get_shift, set_shift_fun, get_sub_shift, set_sub_shift_fun } from './shifts_functions';
import { useNavigate } from 'react-router-dom';
import { set_localstorage } from '../../components/logic/localstorage';
import { app_api_post } from '../../components/logic/apis';
import { get_localstorage } from '../../components/logic/localstorage';
import Backdropfun from '../../components/logic/loading'
import ResponsiveDialog from '../../components/logic/alert'
import { app_api_get } from '../../components/logic/apis';

export default function StartShift() {
	let [shift, set_shift] = useState({});
	let [sub_shift, set_sub_shift] = useState({});
	let [add_hidden, set_add_hidden] = useState(true);
	let [catalog, set_catalog] = useState(null);
    let navigate = useNavigate();
	let [open, setOpen] = useState(false)
	let [alert, set_alert] = useState(false)
	let [message, set_message] = useState()



	useEffect(() => {
		
		
		get_catalog().then((response) => {
			set_catalog(response);
		});
		get_sub_shift().then((data)=> {
			set_sub_shift(data)
		})
	}, []);

	useEffect(() => {

		if (catalog !== null) {
			let shit_data = get_shift();	
			shit_data.then((x) => {
				// check if the user started the shift go to home 
				if (x && x.start_time && !x.end_time && x.current_shift_id !== null ) {
					navigate('/home');
					console.log(x)
					console.log("35")
				}
				x.inventory = {};
				
				for (let i of catalog.objects) {
					if(i.type !=='ITEM')
					continue
					x.inventory[i?.item_data?.name] = {
						start_shift: 0,
						sold: 0,
						sold_at_square:0,
						refund:0,
						id: i["item_data"]["variations"][0]["id"]	
					};

				}
				set_shift(x);
			});


		}
	}, [catalog]);

	const handleCloseAlert = () => {
			set_alert(false)
		};
	// for loading the page
	const handleClose = () => {
		setOpen(false);
	};

	const handleToggle = () => {
		setOpen(!open); 
	}; 

	function onStartShift() {
		handleToggle()
		console.log("shift before start")
		console.log(shift)
		console.log(sub_shift)
		let date = new Date().toISOString();
		app_api_post('square/', {
			request_type: 'post',
			url: '/labor/shifts',
			payload: {
				shift: {
					wage: {},
					status: 'OPEN',
					location_id: shift.square_location_id,
					start_at: date,
					team_member_id: shift.square_team_member_id,
				},
			},
		}).then(res =>
			{
				if(res.errors)
				{
					handleClose()
					set_alert(true)
					set_message(res.errors[0].detail + "  " + res.errors[0].field)
					console.log(res.errors)
				}
				else{
					shift.start_time = date
					shift.sub_shift_round = 1
					shift.end_time = null;
					shift.current_shift_id = res?.shift?.id
					sub_shift.start_time = date
					sub_shift.end_time = null;
					sub_shift.current_shift_id = res?.shift?.id
					console.log("75")
					console.log(shift)
					set_shift_fun(shift);
					set_sub_shift_fun(sub_shift)
					navigate('/home')
					handleClose()
				}

			}
			)

	}

	function update_money(money) {
		console.log("tessssss")
		console.log(sub_shift)
		shift.start_shift_cash = money;
		shift.refund_cash = 0;
		shift.refund_visa = 0;
		shift.shift_money_cash = 0;
		shift.shift_money_visa = 0;
		set_shift({ ...shift });
		
		sub_shift.start_shift_cash = Number(money);
		sub_shift.refund_cash = 0;
		sub_shift.refund_visa = 0;
		sub_shift.shift_money_cash = 0;
		sub_shift.shift_money_visa = 0;
		set_sub_shift({ ...sub_shift });
	}

	function update_inventory(key, value) {
		console.log(shift)
		shift.inventory[key].start_shift = (value)?parseInt(value):0
		set_shift({ ...shift });
		set_sub_shift({ ...sub_shift });
	}

	return (
		
		<Card style={{ marginTop: 100 }}>
			<Backdropfun open={open}/>
			<ResponsiveDialog 
            alert={alert} message={message} handleCloseAlert={handleCloseAlert}  
            />
			<Card.Body>
				<Card.Title>Start Shift</Card.Title>
				<Grid container spacing={2}>
					<Grid item xs={12} md={12} key="string1" >
						<TextField
							key="string2"
							inputMode='numeric'
							label='Money'
							value={`${shift.start_shift_cash}`}
							onChange={(e) => {
								update_money(e.target.value);
							}}
						/>
					</Grid>

					<Grid item xs={12} md={12}>
						<Card.Title>Inventory</Card.Title>
						<Grid container spacing={2} key="string3">
							{shift.inventory &&
								Object.keys(shift.inventory).map((key, i) => {
									return (
										<Grid xs={12} md={6} lg={4} item key={key}>
											<div className='m-2' style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
												<span style={{ width: 100 }} >{key}</span>
												<TextField
													inputMode='numeric'
													label={key}
													defaultValue={(shift.inventory[key].start_shift)? shift.inventory[key].start_shift: " "}
													
													onChange={(e) => {
														update_inventory(key, e.target.value);
													}}
												/>
											</div>
										</Grid>
									);
								})}
						</Grid>
						<Grid xs={12} md={12} lg={12} item hidden={add_hidden}>
							<TextField id='key' label='Key' />
							<TextField id='value' label='Value' />
						</Grid>
					</Grid>
				</Grid>
				<Grid container spacing={2}>
					<Grid item xs={12} md={12} style={{ display: 'flex', justifyContent: 'right', alignItems: 'right', marginTop: 10 }}>
						<Button variant='outlined' onClick={onStartShift}>
							Start
						</Button>
					</Grid>
				</Grid>
			</Card.Body>
		</Card>
	);
}
