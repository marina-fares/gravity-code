import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export default function AlertFun({ open_alert, set_open_alert, message, setLoading }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Dialog
      fullScreen={fullScreen}
      open={open_alert || false}
      aria-labelledby="responsive-dialog-title"
      onClose={() => set_open_alert(false)}
      PaperProps={{
        sx: {
          borderRadius: 3,
          minWidth: { sm: 360 },
          maxWidth: 480,
        },
      }}
    >
      <DialogTitle id="responsive-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <InfoOutlinedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <span>Message</span>
        </Box>
      </DialogTitle>

      <DialogContent>
        <DialogContentText
          key={message}
          sx={{ color: 'text.primary', fontSize: '0.9rem', lineHeight: 1.7 }}
        >
          {typeof message === 'string' ? message : 'An error occurred.'}
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        <Button
          variant="contained"
          onClick={() => {
            setLoading(false);
            set_open_alert(false);
          }}
          sx={{ minWidth: 90 }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
