import List from './list';
import { app_api_get } from '../../../components/logic/apis';
import { Fragment, useState } from 'react';
import{ useEffect } from 'react';


export default function AvailableSlots({date, session_type}){

  
  let [availableSessions, setAvailableSessions] = useState([]);
  let [selectedProduct, setSelectedProduct] = useState('');


  useEffect(
    ()=>{
      if((session_type !== selectedProduct) ){
        set_available_slots(date, session_type)
      }
      else{
        // 
      }
    }
    ,[date,session_type]
  )

  function set_available_slots(date, session_type ){
   if(date && session_type){

   
    setSelectedProduct(session_type.name )
 
    const startTime = (new Date(date).toISOString())
    
    const tomorrow =  new Date(date)
    tomorrow.setHours(24)

    const endTime = (tomorrow.toISOString())
 
  app_api_get('bookeo/', {
    "request_type": "get",
    "url": "/availability/slots",
    "payload": { "startTime": startTime , "endTime" : endTime,productId: session_type.productId},
  })
  .then(response => {
  setAvailableSessions(response.data || [])
  })
   }
  }
  
    

   



  return (
    <List data= {availableSessions} session_type={session_type} className='m-5' />
  )
}
