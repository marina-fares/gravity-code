import { app_api_get } from "../../components/logic/apis"

function delete_hold(){
        try{
			if(localStorage.getItem('hold_ids') !== null)
			{
				app_api_get('bookeo/', {
					"request_type": "delete",
					"url": "/holds/" + localStorage.getItem('hold_ids'),
					"payload": {}}
					 ).then(()=>{
						set_localstorage('hold_ids', null)
					 })
			}

	}catch(error)
	{
		console.log("this is no holds to delete", error)
	}


	}


// get the customer name
function set_customer_fun(e){
    return {"firstName":e.target.value.split(" ")[0], "lastName":e.target.value.split(" ")[1]}
    }




// set the booking options


    // get the number of players
    function set_numbers_fun(e, categoryId){
       
        return([{
            "peopleCategoryId": categoryId,
            "number": e.target.value
        }])
    }

	function set_payment_fun(firstPaid, secondPaid, firstPaid_method, secondPaid_method){
		if(firstPaid !== '' && secondPaid !== "")
		{
			return(
				[{
					"reason": "Initial deposit1",
					"comment": "external1",
					"description": "Prepaid package MemberShip 1",
					"amount": {
					"amount": firstPaid,
					"currency": "EGP"
					},
					"paymentMethod": firstPaid_method
				},
			
				{
					"reason": "Initial deposit1",
					"comment": "external1",
					"description": "Prepaid package MemberShip 1",
					"amount": {
					"amount": secondPaid,
					"currency": "EGP"
					},
					"paymentMethod": secondPaid_method
				}]
			)
			
		}
		else if(firstPaid !=='' && secondPaid === '')
		{
			return([{
				"reason": "Initial deposit1",
				"comment": "external1",
				"description": "Prepaid package MemberShip 1",
				"amount": {
				"amount": firstPaid,
				"currency": "EGP"
				},
				"paymentMethod": firstPaid_method
			}])
		}
	}
	


export {delete_hold, set_numbers_fun, set_payment_fun}