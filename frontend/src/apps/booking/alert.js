import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useEffect } from 'react';
import { useState } from 'react';
import { InvoicePrint } from './invoice'
import Alert from '@mui/material/Alert';


export default function ResponsiveDialog(data) {

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [val, set_val] = useState()

  
useEffect(() => {
    console.log("data.alerterorrrrrrrrrrrrrrrrrrrrrr")
    console.log(data)
    // if there is an error in the booking remove the old square booking data 
    if(!data.bookingsuccess && data.alert)
    {
      data.set_square_order_id()
      data.set_payment_ids()
    }
}, [data.alert]);

function create(){
  data.set_create_order_flag(true)
}

  return (
    <div>

      <Dialog
        fullScreen={fullScreen}
        open={data.alert}
        aria-labelledby="responsive-dialog-title"
      >
        <DialogTitle id="responsive-dialog-title">
          {"Message"}
        </DialogTitle>
        { data.alert_threshold_amount && <Alert variant="outlined" severity="success">
                You've reached the Threshold amount,
                You should split your shift
		    </Alert>}
        <DialogContent>
          {data.message && !data.bookingsuccess && <DialogContentText>
            {data.message}
          </DialogContentText>}
          {data.bookingsuccess &&  <InvoicePrint shift={
                {square_receipt_number: data.square_receipt_number,
                    branch_name: data.updated_shift.branch_name,
                    location_name: data.updated_shift.location_name,
                    city: data.updated_shift.city,
                    total_price: data.square_totalprice,
                    first_paid: (data.firstPaid)?data.firstPaid:"",
                    first_paid_method: (data.firstPaid_method)?data.firstPaid_method:"",
                    options: data.options_square_items,
                    promocode: data.promocode,
                    alert_threshold_amount : data.alert_threshold_amount
                }} note={val} set_note={set_val}/>}

        </DialogContent>
        <DialogActions>
            
          <Button autoFocus onClick={data.handleCloseAlert}>
            Close
          </Button>
          <Button  autoFocus onClick={create}>
            Book in the next session
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}