import { app_api_get } from "../../components/logic/apis"
import { get_localstorage, set_localstorage } from "../../components/logic/localstorage"

export default function delete_hold(){
    let hold_id  = get_localstorage('hold_ids')
    if(hold_id !== null)
    {
                    
                
    app_api_get('bookeo/', {
    "request_type": "delete",
    "url": "/holds/" + hold_id,
    "payload": {}}
        ).then((res)=>
        {
            set_localstorage('hold_ids', null)
        }
        )
              
    }
    
    
}