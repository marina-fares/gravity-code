import List from './list';
import { app_api_get } from '../../../components/logic/apis';
import { Fragment, useState } from 'react';
import{ useEffect } from 'react';


export default function AvailableSlots({date, session_type}){

  
  let [available_sessions, set_available_sessions] = useState([]);
  let [current_session_type, set_current_session_type] = useState('');


  useEffect(
    ()=>{
      if((session_type !== current_session_type) ){
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

   
    set_current_session_type(session_type.name )
 
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
  set_available_sessions(response.data || [])
  })
   }
  }
  
    

   



  return (
    <List data= {available_sessions} session_type={session_type} className='m-5' />
  )
}
