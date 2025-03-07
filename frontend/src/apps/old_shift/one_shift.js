

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
import { useLocation } from 'react-router-dom';
import { InvoicePrint } from './invocie';
import { get_and_store_user, get_user_and_jwt } from '../../components/logic/users';
import { get_shift } from '../Enventory/shifts_functions';

export default function OneOldShift(){
    const {state} = useLocation();
  
    let [userShift, set_userShift] = useState();
    useEffect(() => {
      let shit_data = get_shift();		  
        shit_data.then((x) => {
        set_userShift(x)
        console.log(Object.keys(x.options))
        })
      },[])

    return(
        <div>
{state &&
<Card.Body className="container">

<h4>{state.profile.username}</h4>
<InvoicePrint shift={state}   />
{state.json_data &&

<Card.Text>
  <h4 align="left" > note: {state.note}</h4>
  {Object.entries(state.json_data["note"]).map(([key, val])=>(
  <div align="left" > {key}: {val}</div>
  ))}
</Card.Text>
  }
{ state.json_data &&

  <TableContainer component={Paper}>
  <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
    <TableHead>
      <TableRow>
        <TableCell>Name</TableCell>
        <TableCell align="right">Start</TableCell>
        <TableCell align="right">Sold</TableCell>
        <TableCell align="right">Sold At Square</TableCell>
        <TableCell align="right">Refund</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>

    {    Object.entries(state.json_data["inventory"]).map(([key, val])=>{ 
       return(
        val.sold + val.sold_at_square + val.start_shift !== 0 &&   <TableRow
          key={key}
          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
        >
          <TableCell component="th" scope="row">
            {key}
          </TableCell>
          <TableCell align="right">{val.start_shift}</TableCell>
          <TableCell align="right">{val.sold}</TableCell>
          <TableCell align="right">{val.sold_at_square}</TableCell>
          <TableCell align="right">{val.refund}</TableCell>
        </TableRow>
      )})
      }





    </TableBody>
  </Table>
</TableContainer>
    }

</Card.Body>}
        </div>
    )

}



