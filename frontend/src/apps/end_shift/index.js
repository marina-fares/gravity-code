import { useEffect, useRef, useState } from 'react';
import { Button, Grid, InputLabel, Input, Alert, FormControl } from '@mui/material';
import Card from 'react-bootstrap/Card';
import InvoicePrint from '../../components/ui/InvoicePrint';
import { get_shift, get_sub_shift } from '../../components/logic/shifts_functions_apis';
import { end_shift } from '../../components/logic/shifts_functions';
import LoadingFun from '../../components/ui/loading';
import AlertFun from '../../components/ui/alert';
import { useNavigate } from 'react-router-dom';

export default function EndShift() {
	const [shift_details, set_shift_details] = useState(null);
	const [sub_shift_details, set_sub_shift_details] = useState(null);
	const [passwordValid, setPasswordValid] = useState(false);
	const [showAlert, setShowAlert] = useState(false);
	const [actualCash, setActualCash] = useState(0);
	const [actualVisa, setActualVisa] = useState(0);
	const [loading, setLoading] = useState(false)
	const [alert, setAlert] = useState(false)
	const [alertMessage, setAlertMessage] = useState('')
	const navigate = useNavigate();

	const printRef = useRef();

	useEffect(() => {
		const fetchData = async () => {
			const shiftData = await get_shift();
			set_shift_details(shiftData);

			const subShiftData = await get_sub_shift();
			set_sub_shift_details(subShiftData);
		};
		fetchData();
	}, []);

	async function end_shift_fun(){
		setLoading(true)
		console.log(shift_details)
		console.log(sub_shift_details)
		const response = await end_shift(shift_details, sub_shift_details);
		if (response){
			setLoading(false)
			setAlert(true)
			setAlertMessage(`${response[0].detail}, ${response[0].field}`)
		}
		else{
			navigate('/')
		}
	}
	const handleSubmit = (e) => {
		e.preventDefault();

		if (shift_details?.endshift_page_password === e.target.password.value) {
			setShowAlert(false);
			setPasswordValid(true);
		} else {
			setShowAlert(true);
		}
	};

	const renderInventoryTable = () => {
		if (!shift_details?.inventory) return null;
	
		const filteredItems = Object.entries(shift_details.inventory).filter(([_, details]) =>
			details.start_shift + details.sold + details.sold_at_square !== 0
		);
	
		if (filteredItems.length === 0) return null;
	
		return (
			<table className="table table-striped mt-4">
				<thead>
					<tr>
						<th>Item</th>
						<th>Start Shift</th>
						<th>Sold</th>
						<th>Sold at Square</th>
						<th>Refund</th>
					</tr>
				</thead>
				<tbody>
					{filteredItems.map(([item, details]) => (
						<tr key={item}>
							<td>{item}</td>
							<td>{details.start_shift}</td>
							<td>{details.sold}</td>
							<td>{details.sold_at_square}</td>
							<td>{details.refund}</td>
						</tr>
					))}
				</tbody>
			</table>
		);
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
				<LoadingFun open={loading} />
				<AlertFun set_open_alert={setAlert} open_alert={alert} message={alertMessage} setLoading={(setLoading)} />
								
				<Card.Body>
					<Card.Title>End Shift</Card.Title>
					<div className='d-flex flex-row'>
						<div className='d-flex flex-column w-50'>
							<InvoicePrint shift={shift_details} calculated_cash={actualCash} calculated_visa={actualVisa} />
						</div>
						<div className='d-flex flex-column align-items-center w-50'>
							<label style={{ margin: '10px' }} className='d-flex flex-column w-50'>Actual Cash in Drawer</label>
							<Input
								className='form-control d-flex flex-column w-50'
								type="number"
								value={actualCash}
								onChange={(e) => {
									setActualCash(e.target.value)
									set_shift_details(prev => ({...prev,
										actual_cash: Number(e.target.value)})
									)
									set_sub_shift_details(prev => ({...prev,
										actual_cash: Number(e.target.value)})
									)
								}}
							/>

							<label style={{ margin: '10px' }} className='d-flex flex-column w-50'>Actual Visa in Drawer</label>
							<Input
								className='form-control d-flex flex-column w-50'
								type="number"
								value={actualVisa}
								onChange={(e) => {
									setActualVisa(e.target.value)
									set_shift_details(prev => ({...prev,
										actual_visa: Number(e.target.value)})
									)
									set_sub_shift_details(prev => ({...prev,
										actual_visa: Number(e.target.value)})
									)
								}}
							/>
							<div className=' d-flex flex-row justify-content-center w-100'>
								<Card className="m-3">
									<Card.Title className="m-3">Shift Cash</Card.Title>
									<Card.Body>
										<h3>{shift_details.start_shift_cash + shift_details.shift_money_cash - shift_details.refund_cash} LE</h3>
									</Card.Body>
								</Card>

								<Card className="m-3 ">
									<Card.Title className="m-3">Shift Visa</Card.Title>
									<Card.Body>
										<h3>{shift_details.shift_money_visa} LE</h3>
									</Card.Body>
								</Card>
							</div>
							<Card className="m-3 w-75">
								<Card.Title className="m-3">Waffarha Codes</Card.Title>
								<Card.Body>
									<p>Note: {JSON.stringify(shift_details.note)}</p>
								</Card.Body>
							</Card>
						</div>
					</div>

					<Grid container spacing={2} justifyContent="center" ref={printRef}>

						<Grid item xs={12} style={{ marginTop: 50 }}>
							<Card.Title>Inventory</Card.Title>
							<Grid container spacing={2}>
								{renderInventoryTable()}
							</Grid>

							<Button
								variant="contained"
								className="p-2 m-2"
								onClick={() => end_shift_fun()}
							>
								End Shift
							</Button>
						</Grid>
					</Grid>
				</Card.Body>
			</Card>
		</>
	);
}
