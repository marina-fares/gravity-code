import List from './list';
import { app_api_get } from '../../../components/logic/apis';
import { Fragment, useState } from 'react';
import{ useEffect } from 'react';
import { get_available_sessions } from '../../../components/logic/sessions_apis';

export default function AvailableSlots({date, allProducts, selectedProduct, setSelectedProduct}){

  
  let [availableSessions, setAvailableSessions] = useState([]);


  useEffect(
    ()=>{
      console.log("----------------15", date, selectedProduct)
      if((date && selectedProduct) ){
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
    <List date={date} availableSessions={availableSessions} selectedProduct={selectedProduct} className='m-5' />
  )
}
