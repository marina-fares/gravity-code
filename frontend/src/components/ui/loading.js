import * as React from 'react';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography'; // استوردنا Typography للكتابة

export default function LoadingFun({ open, message = "Loading, please wait..." }) {
  return (
    <Backdrop
      sx={{ 
        color: '#fff', 
        zIndex: (theme) => theme.zIndex.drawer + 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2 
      }}
      open={open || false}
    >
      <CircularProgress color="inherit" />
      <Typography variant="h6" component="div">
        {message || "Loading..."}
      </Typography>
    </Backdrop>
  );
}
