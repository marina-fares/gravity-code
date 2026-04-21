import * as React from 'react';
import TextField from '@mui/material/TextField';
import { useState, useEffect } from 'react';
import { get_old_bookings } from './functioncs_api';
import List from "../session_bookings_history/List";

export default function BookingsHistory() {
  const [inputText, setInputText] = React.useState("");
  let [bookingDetails, setBookingDetails] = useState()
  
    useEffect(() => {
    
        const fetchData = async()=>{
            const search_field = inputText
            const response = await get_old_bookings({search_field})
            setBookingDetails(response)
        }
    if (inputText){
        fetchData()
    }
     
    }, [ inputText]);
  

  let inputHandler = (e) => {
    var lowerCase = e.target.value;
    setInputText(lowerCase);
  };

  return (
    <div className="main">
      <h4>Search By The Receipt Code</h4>
        
        <div className="search">
        <TextField
            id="outlined-basic"
            onChange={inputHandler}
            variant="outlined"
            fullWidth
            label="Search"
          />
        </div>
        <List bookings={bookingDetails} />

    
    </div>
  );
}