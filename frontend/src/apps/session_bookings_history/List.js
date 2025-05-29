
import { useNavigate } from 'react-router-dom'
import {  List as Mulist, Button} from '@mui/material';



export default function List({ bookings}) {

    const navigate = useNavigate();
  

    function openbooking(item){
        navigate(`/booking/${item.session}/${item.id}/`)
    }


    return (
      <div>
        {bookings && 
          <Mulist className='flex-column'>
            {bookings.map((item) => (
              <Button
                key={item.id}
                value={item.id}
                  onClick={() => openbooking(item)}
                sx={{ textTransform: "none" }}
              >
                {item.id} - {item.status} - {item.number_of_players}
              </Button>
            ))
            }
          </Mulist>
        }


</div>
    )
}