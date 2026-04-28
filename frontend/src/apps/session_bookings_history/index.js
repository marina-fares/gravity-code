import * as React from 'react';
import { useParams } from "react-router-dom";
import { useEffect } from 'react';
import { get_old_bookings_for_spesific_session } from '../../components/logic/booking_functions'

import List from "./List";

export default function OldBookings() {

  const searchParams = useParams();
  const sessionId = searchParams.session_id;
  const [bookings, setBookings] = React.useState();
  
  useEffect(()=>{
    if(sessionId)
    {
      fetchData(sessionId);
    }
  },[sessionId])

  const fetchData = async (sessionId) => {
      const bookingsData = await get_old_bookings_for_spesific_session(sessionId)
      setBookings(bookingsData.data)
  }


  return (
    <div className="main">
      <h4>All Bookings </h4>

        <List bookings={bookings} />
    </div>
  );
}