import List from './list';
import{ useEffect, useState } from 'react';
import { get_available_sessions } from '../../../components/logic/booking_functions';

export default function AvailableSlots({date, allProducts, selectedProduct, setSelectedProduct, add_block_seats}){

  
  let [availableSessions, setAvailableSessions] = useState([]);


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
    setAvailableSessions(data)
  }
  
    

   



  return (
    <List date={date} availableSessions={availableSessions} selectedProduct={selectedProduct} add_block_seats={add_block_seats} className='m-5' />
  )
}
