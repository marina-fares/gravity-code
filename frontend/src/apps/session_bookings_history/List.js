
import { useNavigate } from 'react-router-dom'
import {  List as Mulist} from '@mui/material';
import {ListItem, ListItemText, Box} from '@mui/material';



export default function List({ bookings}) {

    const navigate = useNavigate();
  

    function openbooking(item){
        navigate(`/booking/${item.session}/${item.id}/`)
    }


    return (
      <div>
        {bookings && 
            <Mulist className="flex-column ">
            {bookings.map((item) => {
                const dateObj = new Date(item.created_at);
                const dateOnly = dateObj.toISOString().split('T')[0];
                const timeOnly = dateObj.toISOString().split('T')[1].split('.')[0];

                return (
                    <ListItem
                        key={item.id}
                        alignItems="flex-start"
                        className="w-100 border mb-2 rounded"
                        onClick={() => openbooking(item)}
                    >
                    <ListItemText
                        disableTypography
                        className="m-0 p-0"
                        primary={
                        <Box className="list-group-item list-group-item-secondary rounded p-2 d-flex justify-content-between align-items-center">
                            <span>{`${dateOnly} ${timeOnly}`}</span>
                            <span>{item.type_of_players} {item.id}</span>
                        </Box>
                        }
                        secondary={
                        <div className="d-flex flex-column p-2">
                            <span><strong>Number Of Players:</strong> {item.number_of_players}</span>
                            {item.options && item.options.map((option, index) =>
                            option.name !== item.type_of_players ? (
                                <span key={index}>
                                <strong>{option.name}:</strong> {option.quantity}
                                </span>
                            ) : null
                            )}

                            
                            {item.payment.promoCode && (
                            <span><strong>PromoCode:</strong> {item.payment.promoCode}</span>
                            )}
                            <span><strong>Receipt Number:</strong> {item.square_receipt_number}</span>
                            <span><strong>Total Price:</strong> {item.payment.amount}</span>
                        </div>
                        }
                    />

                  </ListItem>
                );
            })}
            </Mulist>
        }


</div>
    )
}