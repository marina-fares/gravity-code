import { Button, Container, FormControl, InputLabel, MenuItem } from '@mui/material';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import { Stack } from '@mui/system';
import { app_api_get } from '../../components/logic/apis';
import { useState } from 'react';
import { useEffect } from 'react';
import Card from 'react-bootstrap/Card';
import get_sessions from '../home/avaliable_slotes/index'
import OldBookings from './refund_booking';
import { useNavigate } from 'react-router-dom';
import { set_localstorage } from '../../components/logic/localstorage';

export default function HomeInput({ date, set_date, set_session_type }) {
	let [sessions_type, set_sessions_type] = useState([0]);
	let [selectet_session_type, set_selected_sessions_type] = useState('');
	const navigate = useNavigate();

	console.log("new")
	
	var today = new Date();
	var today = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, '0') + '-' + today.getDate().toString().padStart(2, '0');

	useEffect(() => {
		console.log("one")
		console.log("two")
		console.log(today)
		set_date(today || '');
		app_api_get('bookeo/', {
			request_type: 'get',
			url: '/settings/products',
			payload: {},
		}).then((response) => {
			console.log("-----------------", response.data)
			set_sessions_type(response.data );
			console.log(response.data[0])
			set_selected_sessions_type(response.data[0])
			set_session_type(response.data[0])
		});
	}, []);



	function refund(){

		// eslint-disable-next-line no-lone-blocks
		set_localstorage('date', date )
		set_localstorage('session_type', selectet_session_type )
		navigate('/oldbookings')
	}

	function get_available_sessions_type(e) {
		// console.log("get sessions",e.target.value)
		// console.log("yes")
		let session_index = e.target.value
		// console.log("session key", session_index)
		set_session_type(sessions_type[session_index] );
		set_selected_sessions_type(sessions_type[session_index].name  )
		// console.log(sessions_type[session_index].name)
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
