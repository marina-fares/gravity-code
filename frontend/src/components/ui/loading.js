import * as React from 'react';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export default function LoadingFun({ open, message = "Loading, please wait..." }) {
  return (
    <Backdrop
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'rgba(13, 33, 55, 0.70)',
        backdropFilter: 'blur(6px)',
      }}
      open={open || false}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          p: 4,
          borderRadius: 3,
          backgroundColor: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.18)',
          backdropFilter: 'blur(10px)',
          minWidth: 180,
        }}
      >
        <CircularProgress
          sx={{ color: 'primary.main' }}
          size={48}
          thickness={4}
        />
        <Typography
          variant="body1"
          sx={{ color: '#ffffff', fontWeight: 600, fontSize: '0.95rem', textAlign: 'center' }}
        >
          {message || "Loading..."}
        </Typography>
      </Box>
    </Backdrop>
  );
}
