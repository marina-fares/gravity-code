import List from './list';
import{ useEffect, useState } from 'react';
import { get_available_sessions } from '../../../components/logic/booking_functions';
import AlertFun from '../../../components/ui/alert';
export default function AvailableSlots({date, allProducts, selectedProduct, setSelectedProduct, add_block_seats}){

  
  let [availableSessions, setAvailableSessions] = useState([]);
  let [alert, setAlert] = useState(false);
  let [alertMessage, setAlertMessage] = useState('');
  let [isLoading, setIsLoading] = useState(false);


  useEffect(
    
    ()=>{
      if((date && selectedProduct) ){
        console.log("date", date)
        console.log("selectedProduct", selectedProduct) 
        set_available_slots(date, selectedProduct)
      }
    }
    ,[date,selectedProduct]
  )

async  function set_available_slots(date, selectedProduct ){
 
    const payload = { "date": date , "product" : selectedProduct.id}

    const data = await get_available_sessions(payload);
    if (data.status) {
      setAlert(true);
      setAlertMessage(`Error fetching available sessions. Please try again later: ${data.error}`);
      return;
    }
    setAvailableSessions(data)
  }
  
    

   



  return (
    <div>
    <AlertFun set_open_alert={setAlert} open_alert={alert} message={alertMessage} setLoading={setIsLoading} />
    <List date={date} availableSessions={availableSessions} selectedProduct={selectedProduct} add_block_seats={add_block_seats} className='m-5' />
  </div>
  )
}
