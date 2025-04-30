import { Button, buttonClasses, Grid, InputLabel, TextField } from '@mui/material';
import React, { Fragment, useEffect, useState } from 'react';

import Card from 'react-bootstrap/Card';
import Input from '@mui/material/Input';
import { get_catalog, get_shift, set_shift_fun } from './shifts_functions';
import { useNavigate } from 'react-router-dom';
import InvoicePrint from '../../components/ui/InvoicePrint';
import { end_shift, get_sub_shift, set_sub_shift_fun, split_shift } from '../start_shift/shifts_functions';
import ReactToPrint from 'react-to-print';
import { app_post } from '../../components/logic/app';
// import { useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { FormControl, FormLabel } from '@mui/material';
import {CircularProgress} from '@mui/material'
import { app_api_get } from '../../components/logic/apis';
import { app_get } from '../../components/logic/app';


export default function EndSubShit() {
	let [updated_shift, set_updated_shift] = useState(null);
	const [sub_shift, set_sub_shift] = useState();
	let print_ref = React.createRef();
	let navigate = useNavigate();
	let [alert, set_alert] = React.useState(false)
	let [check_password, set_check_password] = React.useState(false)
	const [hide, set_hide] = useState(false);

		const [calculated_cash, set_calculated_cash] = React.useState(0);
		const [calculated_visa, set_calculated_visa] = React.useState(0);
		// const [updated_shift, set_updated_shift] = React.useState(JSON.parse(get_localstorage('shift')));
		


	useEffect(() => {
		get_shift().then((x) => {
			(x.current_shift_id === null)?set_hide(true): set_hide(false)
			set_updated_shift(x);
		});
		get_sub_shift().then((x) =>{
			set_sub_shift(x)
		})
		app_get("current_group/")
		console.log(app_get("current_group/"))
	}, []);


	useEffect(() => {
		if(sub_shift)
		{
			sub_shift.actual_cash = parseInt(calculated_cash)
			sub_shift.actual_visa = parseInt(calculated_visa)
			console.log("invoice print")
			console.log(sub_shift)
			set_shift_fun(set_updated_shift)
		}
	}, [calculated_cash, calculated_visa]);

	const handleSubmit = (event) => {
		event.preventDefault(); // Prevent page refresh
		if (updated_shift.endshift_page_password === event.target.password.value)
		{
			set_alert(false)
			set_check_password(true)
		}
		else{
			set_alert(true)
		}
	}

	return (
		<>
		{alert && <Alert severity="error">The Entered password is not Correct</Alert>}
		{updated_shift && !hide? 
		<> 
				{!check_password? 
					<FormControl component='form' onSubmit={handleSubmit} className="m-5">
						<InputLabel htmlFor="my-input">Add your Password</InputLabel>
						<Input id="password" aria-describedby="my-helper-text" type="password" />
						<Button type='submit' fullWidth variant='contained' sx={{ mt: 3, mb: 2 }}>
							Submit
						</Button>
					</FormControl>
						:
					<div>
					{ sub_shift && updated_shift &&
						<Card style={{ marginTop: 100 }}>
						<Card.Body>
							<Card.Title>Sub Shift {updated_shift.sub_shift_round}</Card.Title>
							<div>
								<label style={{ margin: '10px' }} className=' d-flex flex-column justify-content-end w-25'>Actual In Drawer Cash</label>
								<Input
									className='form-control d-flex flex-column justify-content-end w-25'
									defaultValue={1}
									onChange={(e) => set_calculated_cash(e.target.value)}
									type='number'
									name='cash'
									label='cash'
									value={calculated_cash}
									// step='0'
								/>
								<label style={{ margin: '10px' }} className=' d-flex flex-column justify-content-end w-25'>Actual In Drawer Visa</label>
								<Input
									className='form-control d-flex flex-column justify-content-end w-25'
									defaultValue={1}
									onChange={(e) => set_calculated_visa(e.target.value)}
									type='mumber'
									name='visa'
									label='Visa'
									value={calculated_visa}
									// step='0'
								/>
							</div>
							<InvoicePrint shift={updated_shift} sub_shift={sub_shift} calculated_cash={calculated_cash} calculated_visa={calculated_visa} />
							{/* <InvoicePrint shift={updated_shift} sub_shift={sub_shift}/> */}

							<Grid container spacing={2} style={{ justifyContent: 'center' }} ref={print_ref}>
								<Card style={{ marginTop: 50, marginLeft: 100 }}>
									<Card.Title style={{ marginLeft: 20, marginTop: 20, marginRight:100 }}> Shift Cash </Card.Title>
									<Card.Body>
										<h3>{sub_shift.start_shift_cash + sub_shift.shift_money_cash - sub_shift.refund_cash} LE.</h3>
									</Card.Body>
									
								</Card>
								<Card style={{ marginTop: 50, marginLeft: 100 }}>
									<Card.Title style={{ marginLeft: 20, marginTop: 20, marginRight:100 }}> Shift Visa </Card.Title>
									<Card.Body>
										<h3>{sub_shift.shift_money_visa} LE.</h3>
									</Card.Body>
								</Card>
								<Card style={{ marginTop: 50, marginLeft: 100 }}>
									<Card.Title style={{ marginLeft: 20, marginTop: 20, marginRight:100 }}> Waffarha Codes </Card.Title>
									<Card.Body>
										<p>Note: {JSON.stringify(sub_shift.note)}</p>
									</Card.Body>
								</Card>

								<Grid item xs={12} md={12} style={{ marginTop: 50 }}>
				
									<Button variant="contained" className='p-2 m-2' onClick={() => {
										// <InvoicePrint shift={updated_shift} sub_shift={sub_shift}/>
										// end_shift(updated_shift, sub_shift);
										
										navigate("/end-shift");
									}}>
										End Shift Page
									</Button>
									<Button variant="contained" className='p-2 m-2' onClick={() => {
										split_shift(updated_shift, sub_shift);
									
									}}>
										Split Shift
									</Button>
								</Grid>
							</Grid>
						</Card.Body>
					</Card>}
					</div>
				}
		</> :
			<div>Loading Your shift..., If you haven't started your shift yet, kindly do so.</div>
		}
		</>
	);
}
