import { FormControl, InputLabel, MenuItem, Typography, Box, Paper } from '@mui/material';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import { useState, useEffect } from 'react';

export default function HomeInput({ date, setDate, allProducts, selectedProduct, setSelectedProduct }) {
  const [selectedProductId, setSelectedProductId] = useState();

  var today = new Date();
  var todayDate =
    today.getFullYear() +
    '-' +
    (today.getMonth() + 1).toString().padStart(2, '0') +
    '-' +
    today.getDate().toString().padStart(2, '0');

  useEffect(() => {
    if (setDate && todayDate) {
      setDate(todayDate || '');
    }
  }, [setDate, todayDate]);

  function get_selected_product(e) {
    const selectedProductId = e.target.value;
    const productDetails = allProducts.find((item) => item.id === selectedProductId);
    setSelectedProductId(productDetails.id);
    setSelectedProduct(productDetails);
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid var(--gc-border2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.75rem' }}>
        Filters
      </Typography>

      <TextField
        id="date"
        label="Date"
        type="date"
        onChange={(e) => setDate(e.target.value || '')}
        value={date}
        fullWidth
        InputLabelProps={{ shrink: true }}
      />

      <FormControl fullWidth>
        <InputLabel id="session-type-label">Session Type</InputLabel>
        <Select
          value={selectedProductId ?? allProducts?.[0]?.id ?? ''}
          labelId="session-type-label"
          label="Session Type"
          onChange={get_selected_product}
        >
          {allProducts?.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.nick_name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Paper>
  );
}
