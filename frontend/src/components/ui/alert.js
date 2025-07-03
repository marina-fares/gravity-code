import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

export default function AlertFun({ open_alert, set_open_alert, message, setLoading }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Dialog
      fullScreen={fullScreen}
      open={open_alert || false}
      aria-labelledby="responsive-dialog-title"
      onClose={() => set_open_alert(false)} // Optional: close when clicking outside
    >
      <DialogTitle id="responsive-dialog-title">
        {"Message"}
      </DialogTitle>

      <DialogContent>
         
          <DialogContentText key={message}>
             {typeof message === 'string' ? message : 'An Error Occured'}
          </DialogContentText>
        
      </DialogContent>

      <DialogActions>  
        <Button autoFocus onClick={() => {
          setLoading(false)
          set_open_alert(false)}}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
