import * as React from 'react';
import TextField from '@mui/material/TextField';
import { useState, useEffect, useRef } from 'react';
import { get_old_bookings } from './functioncs_api';
import List from "../session_bookings_history/List";

export default function BookingsHistory() {
  const [inputText, setInputText] = React.useState("");
  let [bookingDetails, setBookingDetails] = useState();
  const latestRequestId = useRef(0);

  useEffect(() => {
    if (!inputText) {
      setBookingDetails(undefined);
      return;
    }

    // Track the request so stale responses are discarded
    const requestId = ++latestRequestId.current;

    const fetchData = async () => {
      const response = await get_old_bookings({ search_field: inputText });
      if (requestId === latestRequestId.current) {
        setBookingDetails(response);
      }
    };

    fetchData();
  }, [inputText]);

  let inputHandler = (e) => {
    setInputText(e.target.value);
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