import { Button, Container, FormControl, InputLabel, MenuItem } from '@mui/material';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import { Stack } from '@mui/system';
import { app_api_get } from '../../components/logic/apis';
import { useState } from 'react';
import { useEffect } from 'react';
import Card from 'react-bootstrap/Card';
import get_sessions from '../home/avaliable_slotes/index'
import OldBookings from '../refund_booking';
import { useNavigate } from 'react-router-dom';
import { set_localstorage } from '../../components/logic/localstorage';

export default function HomeInput({ date, set_date, set_session_type }) {
	let [sessions_type, set_sessions_type] = useState([0]);
	let [selectet_session_type, set_selected_sessions_type] = useState('');
	const navigate = useNavigate();

	
	var today = new Date();
	var today = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, '0') + '-' + today.getDate().toString().padStart(2, '0');

	useEffect(() => {

		set_date(today || '');
		app_api_get('product/', {
			request_type: 'get',
			payload: {},
		}).then((response) => {
			console.log("----------------------------30")
			console.log(response)
		});
	}, []);



	function refund(){

		set_localstorage('date', date )
		set_localstorage('session_type', selectet_session_type )
		navigate('/oldbookings')
	}

	function get_available_sessions_type(e) {

		let session_index = e.target.value
		set_session_type(sessions_type[session_index] );
		set_selected_sessions_type(sessions_type[session_index].name  )
		get_sessions()
	}

	return (
		<Stack className="m-3">
			<TextField
				id='date'
				label='Selected Date'
				type='date'
				onChange={(e) => {
					set_date(e.target.value || '');
				}}
				defaultValue={today}
				sx={{ width: 220 }}
				InputLabelProps={{
					shrink: true,
				}}
			/>
			
			<br></br>
			<FormControl>
				<InputLabel id='demo-multiple-name-label'>Session Type</InputLabel>

				<Select  defaultValue={sessions_type[0]} labelId='demo-multiple-name-label' label="Session Type" onChange={get_available_sessions_type} sx={{ width: 220 }} default="yes">

					{sessions_type.map((type,i) => (
						<MenuItem key={i} value={i}>
							{type.name}
						</MenuItem>
					))}
				</Select>
				<Button onClick={refund}>
					Refund
				</Button>
			</FormControl>
		</Stack>
	);
}
