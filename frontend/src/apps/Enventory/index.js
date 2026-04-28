import { Button, Grid, InputLabel, TextField } from '@mui/material';
import { Fragment, useEffect, useState } from 'react';

import Card from 'react-bootstrap/Card';
import Input from '@mui/material/Input';
import { Delete, Add } from '@mui/icons-material';
import { get_shift, set_shift_fun} from './shifts_functions';
import { useNavigate } from "react-router-dom";


export default function Inventory() {
	let [updated_shift, set_updated_shift] = useState({});
	// let [updated_shift, set_updated_shift] = useState({});
	let [hide, set_hide] = useState(false);

	

	useEffect(() => {
		let x = get_shift();		
		x.then((x) => {
			if(x.status === 200) {
				set_updated_shift(x.data);
			}
			(x.current_shift_id === null)?set_hide(true): set_hide(false)
		});
	}, []);

	function onStartShift() {
		set_shift_fun(updated_shift);
		
	}


	function updated_shift_fun(key) {

			let value = document.getElementById(key).value;
			
			updated_shift.inventory[key]['start_shift'] = parseInt(value);
			set_updated_shift({ ...updated_shift });
			// set_add_hidden(true);
	}

	return (
		<div>
		{(!hide)?  updated_shift &&
			<Card style={{ marginTop: 100 }}>
			<Card.Body>
				<Card.Title>Start Shift</Card.Title>
				<Grid container spacing={2}>

					<Grid item xs={12} md={12}>
						<Card.Title>Inventory</Card.Title>
						<Grid container spacing={2}>
							{updated_shift.inventory &&
								Object.keys(updated_shift.inventory).map((key, i) => {
									return (
									
										<Grid xs={12} md={6} lg={4} item key={key}>
											<div className='m-2' style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
												<span style={{ width: 100 }}>{key}</span>
												<TextField inputMode='numeric' label={key} id={key} value={updated_shift.inventory[key].start_shift || 0} onChange={(e) => {updated_shift_fun(key)}}></TextField>
											</div>
										</Grid>
									);
								})}
							{/* {!shift.inventory ||
								(Object.keys(shift.inventory).length === 0 && (
									<Grid xs={12} md={12} lg={12} item>
										<Add onClick={onAdd} hidden={!add_hidden} />
									</Grid>
								))} */}
						</Grid>
						{/* <Grid xs={12} md={12} lg={12} item hidden={add_hidden}>
							<TextField id='key' label='Key' />
							<TextField id='value' label='Value' />
							<Add onClick={onAdd} />
						</Grid> */}
					</Grid>
				</Grid>
				<Grid container spacing={2}>
					<Grid item xs={12} md={12} style={{ display: 'flex', justifyContent: 'right', alignItems: 'right', marginTop:10 }}>
				<Button variant="outlined" onClick={onStartShift} >Update</Button>
				   </Grid>
				</Grid>

			</Card.Body>
		</Card> : 
			<div>Loading Your shift..., If you haven't started your shift yet, kindly do so.</div>
		}
		</div>
	);
}
