import { useState } from 'react'
import { useEffect } from 'react'
import { app_api_get } from '../../components/logic/apis'
import { get_user_and_jwt } from '../../components/logic/users'
import { useNavigate } from 'react-router-dom'
import { IconButton,  List as Mulist, Button} from '@mui/material';
import { get_shift } from '../Enventory/shifts_functions'


export default function List({bookings}) {

    const navigate = useNavigate();
  

    function openbooking(e){
        navigate(`/booking/${e.target.value}/`)

    }


    function opensquarebooking(e)
    {
      
      navigate(`/square_booking/${e.target.value}`)
    }

    return (
      <div>
        {bookings && 
          <Mulist className='flex-column'>
            {bookings.map((item) => (
              <Button
                key={item.id}
                value={item.id}
                onClick={openbooking}
                sx={{ textTransform: "none" }}
              >
                {item.id} - {item.status}
              </Button>
            ))}
          </Mulist>
        }


</div>
    )
}