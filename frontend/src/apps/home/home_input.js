import { FormControl, InputLabel, MenuItem } from '@mui/material';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import { Stack } from '@mui/system';
import { useState } from 'react';
import { useEffect } from 'react';

export default function HomeInput({ date, setDate, allProducts, selectedProduct, setSelectedProduct }) {
	const [selectedProductId, setSelectedProductId] = useState();

	var today = new Date();
	var todayDate = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, '0') + '-' + today.getDate().toString().padStart(2, '0');

	useEffect(() => {
		if(setDate && todayDate)
		{
		setDate(todayDate || '');
		}
	}, [setDate, todayDate]);


	// function refund(){

	// 	set_localstorage('date', date )
	// 	set_localstorage('session_type', selectedProduct )
	// 	navigate('/oldbookings')
	// }

	function get_selected_product(e) {
		const selectedProductId = e.target.value;
		const productDetails = allProducts.find(item => item.id === selectedProductId);
		setSelectedProductId(productDetails.id)
		setSelectedProduct(productDetails)
	}

	return (
		<Stack className="m-3">
			<TextField
				id='date'
				label='Selected Date'
				type='date'
				onChange={(e) => {
					setDate(e.target.value || '');
				}}
				value={date}
				sx={{ width: 220 }}
				InputLabelProps={{
					shrink: true,
				}}
			/>
			
			<br></br>
			<FormControl>
				<InputLabel id='demo-multiple-name-label'>Session Type</InputLabel>
				<Select
				value={selectedProductId ?? allProducts?.[0]?.id ?? ""}
				labelId='demo-multiple-name-label'
				label="Session Type"
				onChange={get_selected_product}
				sx={{ width: 220 }}
				>
				{allProducts?.map((item) => (
					<MenuItem key={item.id} value={item.id}>
					{item.nick_name}
					</MenuItem>
				))}
				</Select>



			</FormControl>
		</Stack>
	);
}
