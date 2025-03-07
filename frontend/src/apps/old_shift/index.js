
import { app_api_get } from '../../components/logic/apis';
import { Fragment, useState } from 'react';
import{ useEffect } from 'react';
import { app_get, app_post } from '../../components/logic/app';
import Card from 'react-bootstrap/Card';
import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TextField } from '@mui/material';
// import { useNavigate } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { get_user_and_jwt } from '../../components/logic/users';
import { get_shift } from '../Enventory/shifts_functions';

let user = get_user_and_jwt().user;
console.log("user")
console.log(user)


export default function OldShift(){

  
  let [all_shifts, set_all_shifts] = useState([]);
  let [shift, set_shift] = useState([]);
  let [shifts, set_shift_fun] = useState([]);
  let [current_session_type, set_current_session_type] = useState('');
  let [value, set_value] = React.useState(new Date());

	const navigate = useNavigate()


  useEffect(() => {
		let shit_data = get_shift();
		shit_data.then((x) => {
      console.log("the shift is")
      console.log(x)
			set_shift(x);
		});

    let shifts = app_get('old_shift/')
    shifts.then((x) => {
      set_all_shifts(x)
    })
	}, []);



  return (
<div className='m-2'>
  <div>
  <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label="Select Date"
        value={value}
        onChange={(date) => {
          const d2 = new Date(date);
          set_value(d2)
        }
        }
        renderInput={(params) => <TextField {...params} />}
      />
    </LocalizationProvider>

  </div>

    {all_shifts &&
        all_shifts.map((item) => {

    if(new Date(item.date).getDate() === (value).getDate() && new Date(item.date).getMonth() === (value).getMonth()){

        return (
            <div className="" style={{marginBottom: '25px',}}>
            <Card key={item.date} className="m-2" style={{ cursor: "pointer" }}  onClick={()=>{navigate('/one_old_shift', { state: item })}}>
            <Card.Header>{item.date} - {item.profile.username}  </Card.Header>
            </Card>
            
            </div>
            
        );
    }
    })}
</div>
  )
}
