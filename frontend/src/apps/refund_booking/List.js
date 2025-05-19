import { useState } from 'react'
import { useEffect } from 'react'
import { app_api_get } from '../../components/logic/apis'
import { get_user_and_jwt } from '../../components/logic/users'
import { useNavigate } from 'react-router-dom'
import { IconButton,  List as Mulist, Button} from '@mui/material';
import { get_shift } from '../Enventory/shifts_functions'


export default function List(props) {

    let [data, set_data] = useState([])
    let [options_bookings, set_options_bookings] = useState([])
    const navigate = useNavigate();
    useEffect(() => {
      let x = get_shift();
      
      x.then((x) => {
        set_options_bookings(x.options2);
        
      });
    }, []);

    useEffect(() => {

      
      if(props.start_time)
      {


  
        let startTime = new Date(props.start_time)

        let tomorrow = new Date(startTime)
        tomorrow.setDate(tomorrow.getDate() + 2)
        app_api_get('bookeo/', {
          "request_type": "get",
          "url": "/bookings",
          "payload": { "startTime": startTime,
          "endTime": tomorrow,
          "itemsPerPage":100
        },
        })
        .then(response => {
        set_data(response.data)
        })
      }
     
    }, [props.start_time, props.input]);
  

    function openbooking(e){
        navigate(`/booking/${e.target.value}`)

    }


    function opensquarebooking(e)
    {
      
      navigate(`/square_booking/${e.target.value}`)
    }

  const filteredData =(options_bookings.length > 0 )? (options_bookings.filter(entry => Object.keys(entry).some(val => typeof val === "string" && val.includes(props.input)))):[];


  const filteredData2 = data.filter((el) => {
    //if no input the return the original
    if (props.input === '') {
        return el;
    }
    //return the item which contains the user input
    else {

            try{
            return el.source.includes(props.input)
            }catch{
                return el.bookingNumber.includes(props.input)
            }    
        }
})
    return (
      <div>
        <Mulist className='flex-column'>
          {filteredData2.map((item) => (
            ((item.sourceIp))  && 
            (item.sourceIp.split('+')[1] === get_user_and_jwt().user.username &&  <Button className='' key={item.bookingNumber} value={item.bookingNumber} onClick={openbooking} sx={{textTransform: "none"}} >{item.sourceIp.split('+')[1]} - {item.source?item.source:item.bookingNumber} - {item.price.totalNet.amount}</Button>)
                      ))}
        </Mulist>

        <Mulist className='flex-column'>
          {filteredData.map((item) => (

            Object.entries(item)
            .map( ([key, value]) => <Button className='' key={value} value={value} onClick={opensquarebooking} sx={{textTransform: "none"}} > {key} </Button> )
                    ))
                    }
        </Mulist>
</div>
    )
}