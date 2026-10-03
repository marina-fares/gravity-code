import * as React from 'react';
import { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

/**
 * Prompts the user for a password before allowing a protected action.
 * Calls `onSuccess` when the entered value matches `password`,
 * otherwise shows an "Incorrect password" error and keeps the dialog open.
 */
export default function PasswordDialog({ open, title, message, password, onSuccess, onCancel }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);

  // Start with a clean form every time the dialog is opened
  useEffect(() => {
    if (open) {
      setValue('');
      setShowError(false);
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value === password) {
      onSuccess();
    } else {
      setShowError(true);
    }
  };

  return (
    <Dialog
      fullScreen={fullScreen}
      open={open || false}
      aria-labelledby="password-dialog-title"
      onClose={onCancel}
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
        sx: {
          borderRadius: 3,
          minWidth: { sm: 360 },
          maxWidth: 480,
        },
      }}
    >
      <DialogTitle id="password-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LockOutlinedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <span>{title || 'Password Required'}</span>
        </Box>
      </DialogTitle>

      <DialogContent>
        {message && (
          <DialogContentText sx={{ color: 'text.primary', fontSize: '0.9rem', lineHeight: 1.7, mb: 2 }}>
            {message}
          </DialogContentText>
        )}
        {showError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            Incorrect password
          </Alert>
        )}
        <TextField
          autoFocus
          id="password-dialog-input"
          label="Enter Password"
          type="password"
          name="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setShowError(false);
          }}
          error={showError}
          fullWidth
          size="small"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel} sx={{ minWidth: 90 }}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" sx={{ minWidth: 90 }}>
          Unlock
        </Button>
      </DialogActions>
    </Dialog>
  );
}
