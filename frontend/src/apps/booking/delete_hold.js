import { app_api_get } from "../../components/logic/apis"
import { get_localstorage, set_localstorage } from "../../components/logic/localstorage"

export default function delete_hold(){
    let hold_id  = get_localstorage('hold_ids')
    if(hold_id)
    {
        app_api_get('bookeo/', {
            "request_type": "get",
            "url": "/holds/" + hold_id,
            "payload": {}}
                ).then((res)=> {
                console.log("delete hold")
                console.log(res)
                if(res.httpStatus){
                    console.log("one")  
                }
                else{
                    console.log("two")
                    app_api_get('bookeo/', {
                        "request_type": "delete",
                        "url": "/holds/" + hold_id,
                        "payload": {}}
                            )
                }
        
                })
    }
    
    
}