import { Grid, Typography, Box, Paper } from '@mui/material';
import { useState } from 'react';
import AvailableSlots from './avaliable_slotes';
import HomeInput from './home_input';
import { useEffect } from 'react';
import { get_shift } from '../../components/logic/shifts_functions_apis';
import { get_product } from '../../components/logic/booking_functions';
import AlertFun from '../../components/ui/alert';
import LoadingFun from '../../components/ui/loading';

export default function Home() {
  let [date, setDate] = useState(new Date());
  let [allProducts, setAllProducts] = useState([]);
  let [selectedProduct, setSelectedProduct] = useState();
  const [ShiftDetails, SetShiftDetails] = useState();
  let [isLoading, setIsLoading] = useState();
  let [alert, setAlert] = useState(false);
  let [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const shiftData = await get_shift();
      SetShiftDetails(shiftData);

      const productsData = await get_product();
      if (productsData.status == 200) {
        setAllProducts(productsData.data);
        setSelectedProduct(productsData.data[0]);
      } else {
        setAlert(true);
        setAlertMessage(productsData.error);
      }

      setIsLoading(false);
    };
    setIsLoading(true);
    fetchData();
  }, []);

  if (!ShiftDetails) {
    return (
      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Loading your shift…
        </Typography>
      </Box>
    );
  }

  if (ShiftDetails.current_shift_id === null || ShiftDetails.start_time === null) {
    return (
      <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            textAlign: 'center',
            maxWidth: 440,
            border: '1px solid var(--gc-border2)',
          }}
        >
          <Typography variant="h6" sx={{ color: 'secondary.main', fontWeight: 600, mb: 1 }}>
            No Active Shift
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You haven't started your shift yet. Please start a shift to see available sessions.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <>
      <AlertFun set_open_alert={setAlert} open_alert={alert} message={alertMessage} setLoading={setIsLoading} />
      <LoadingFun open={isLoading} />

      <Grid container spacing={3}>
        {/* ── Sidebar filters ───────────────────────────── */}
        <Grid item xs={12} md={2} sx={{ mt: { xs: 1, md: 2 } }}>
          <HomeInput
            date={date}
            setDate={setDate}
            allProducts={allProducts}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
          />
        </Grid>

        {/* ── Session list ──────────────────────────────── */}
        <Grid item xs={12} md={10} sx={{ mt: { xs: 0, md: 1 } }}>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'secondary.main' }}>
              Available Sessions
            </Typography>
            {selectedProduct && (
              <Typography
                variant="body2"
                sx={{
                  bgcolor: 'action.selected',
                  color: 'primary.dark',
                  fontWeight: 600,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  fontSize: '0.8rem',
                }}
              >
                {selectedProduct.nick_name}
              </Typography>
            )}
          </Box>
          <AvailableSlots
            date={date}
            allProducts={allProducts}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
          />
        </Grid>
      </Grid>
    </>
  );
}
