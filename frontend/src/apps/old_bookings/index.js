import * as React from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useParams } from "react-router-dom";

import { useEffect } from 'react';
import { get_old_bookings_for_spesific_session } from '../../components/logic/sessions_apis'

import List from "./List";

export default function OldBookings() {

  const searchParams = useParams();
  const sessionId = searchParams.session_id;
  // console.log("--------------18", searchParams)

  const [value, set_value] = React.useState(new Date());
  const [inputText, setInputText] = React.useState("");
  const [bookings, setBookings] = React.useState();
  
  useEffect(()=>{
    console.log("-------------------23",sessionId)
    if(sessionId)
    {
      fetchData(sessionId);
    }
  },[sessionId])

  const fetchData = async (sessionId) => {
      const bookingsData = await get_old_bookings_for_spesific_session(sessionId)
      console.log(bookingsData)
      setBookings(bookingsData)
  }

  let inputHandler = (e) => {
    var lowerCase = e.target.value;
    setInputText(lowerCase);
  };

  return (
    <div className="main">
      <h4>All Bookings </h4>

        <List bookings={bookings} />
    </div>
  );
}