import React, { useEffect, useRef, useState } from 'react';
import { Button, Grid, InputLabel, Input, Alert, FormControl } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import InvoicePrint from '../../components/ui/InvoicePrint';
import { get_shift, get_sub_shift } from '../../components/logic/shifts_functions_apis';
import { split_shift } from '../../components/logic/shifts_functions';

export default function EndShift() {
	const [shift_details, set_shift_details] = useState(null);
	const [sub_shift_details, set_sub_shift_details] = useState(null);
	const [passwordValid, setPasswordValid] = useState(false);
	const [showAlert, setShowAlert] = useState(false);
	const [actualCash, setActualCash] = useState(0);
	const [actualVisa, setActualVisa] = useState(0);

	const printRef = useRef();
	const navigate = useNavigate();

	useEffect(() => {
		const fetchData = async () => {
			const shiftData = await get_shift();
			set_shift_details(shiftData);

			const subShiftData = await get_sub_shift();
			set_sub_shift_details(subShiftData);
		};
		fetchData();
	}, []);

	const handleSubmit = (e) => {
		e.preventDefault();
		if (shift_details?.endshift_page_password === e.target.password.value) {
			setShowAlert(false);
			setPasswordValid(true);
		} else {
			setShowAlert(true);
		}
	};

	
	if (!(shift_details)?.current_shift_id) {
		return <div>Loading your shift... If you haven't started your shift yet, kindly do so.</div>;
	}

	if (!passwordValid) {
		return (
			<FormControl component="form" onSubmit={handleSubmit} className="m-5">
				{showAlert && <Alert severity="error">Incorrect password</Alert>}
				<InputLabel htmlFor="password">Enter Password</InputLabel>
				<Input id="password" type="password" />
				<Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
					Submit
				</Button>
			</FormControl>
		);
	}

	return (
		<>
			<Card style={{ marginTop: 100 }}>
				<Card.Body>
					<Card.Title>Sub Shift {shift_details.sub_shift_round}</Card.Title>
					<div className='d-flex flex-row'>
						<div className='d-flex flex-column w-50'>
							<InvoicePrint sub_shift={sub_shift_details} shift={shift_details} calculated_cash={actualCash} calculated_visa={actualVisa} />
						</div>
						<div className='d-flex flex-column align-items-center w-50'>	
							<label style={{ margin: '10px' }} className='d-flex flex-column w-50'>Actual Cash in Drawer</label>
							<Input
								className='form-control d-flex flex-column w-50'
								type="number"
								value={actualCash}
								onChange={(e) => setActualCash(e.target.value)}
							/>

							<label style={{ margin: '10px' }} className='d-flex flex-column w-50'>Actual Visa in Drawer</label>
							<Input
								className='form-control d-flex flex-column w-50'
								type="number"
								value={actualVisa}
								onChange={(e) => setActualVisa(e.target.value)}
							/>

							<div className=' d-flex flex-row justify-content-center w-100'>
								<Card className="m-3">
									<Card.Title className="m-3">Shift Cash</Card.Title>
									<Card.Body>
										<h3>{ sub_shift_details.shift_money_cash - sub_shift_details.refund_cash} LE</h3>
									</Card.Body>
								</Card>

								<Card className="m-3">
									<Card.Title className="m-3">Shift Visa</Card.Title>
									<Card.Body>
										<h3>{sub_shift_details.shift_money_visa} LE</h3>
									</Card.Body>
								</Card>
							</div>
							<Card className="m-3 w-75">
								<Card.Title className="m-3">Waffarha Codes</Card.Title>
								<Card.Body>
									<p>Note: {JSON.stringify(sub_shift_details.note)}</p>
								</Card.Body>
							</Card>
							</div>
						</div>
					<Grid container spacing={2} justifyContent="center" ref={printRef}>

						<Grid item xs={12} style={{ marginTop: 50 }}>

						<Button variant="contained" className='p-2 m-2' onClick={() => {
										// <InvoicePrint shift={updated_shift} sub_shift={sub_shift}/>
										// end_shift(updated_shift, sub_shift);
										
										navigate("/end-shift");
									}}>
										End Shift Page
									</Button>
									<Button variant="contained" className='p-2 m-2' onClick={() => {
										split_shift(shift_details, sub_shift_details);
									
									}}>
										Split Shift
									</Button>
						</Grid>
					</Grid>
				</Card.Body>
			</Card>
		</>
	);
}
