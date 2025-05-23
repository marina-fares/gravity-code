import List from './list';
import{ useEffect } from 'react';
import { get_available_sessions } from '../../../components/logic/sessions_apis';

export default function AvailableSlots({date, allProducts, selectedProduct, setSelectedProduct}){

  
  let [availableSessions, setAvailableSessions] = useState([]);


  useEffect(
    ()=>{
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
