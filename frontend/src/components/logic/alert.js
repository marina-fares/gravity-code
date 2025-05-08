import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

export default function ResponsiveDialog(data) {

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));


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
        <DialogContent>
          {data.message && !data.bookingsuccess && <DialogContentText>
            {data.message}
          </DialogContentText>}

        </DialogContent>
        <DialogActions>
            
          <Button autoFocus onClick={data.handleCloseAlert}>
            Close
          </Button>

        </DialogActions>
      </Dialog>
    </div>
  );
}