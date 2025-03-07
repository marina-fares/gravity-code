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


export default function ResponsiveDialog(data) {

//   const [open, setOpen] = React.useState(data.alert);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

//   const handleClickOpen = () => {
//     setOpen(true);
//   };

  
useEffect(() => {
    console.log(data.alert)
    console.log(data.message)
    console.log(data.bookingsuccess)
}, []);


  return (
    <div>
      {/* <Button variant="outlined" >
        Open responsive dialog
      </Button> */}
      <Dialog
      
        open={data.alert}
        // onClose={handleClose}
        aria-labelledby="responsive-dialog-title"
      >
        <DialogTitle id="responsive-dialog-title">
          {"Message"}
        </DialogTitle>
        <DialogContent>
          {data.message && <DialogContentText>
            {data.message}
          </DialogContentText>}

        </DialogContent>
        <DialogActions>
            
          <Button autoFocus onClick={data.handleClose}>
            Close
          </Button>
          
        </DialogActions>
      </Dialog>
    </div>
  );
}