import { useLocation } from 'react-router-dom';
import { Typography, Box, Paper } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import InvoicePrint from '../../components/ui/InvoicePrint';

export default function OneOldShift() {
  const { state } = useLocation();

  if (!state) {
    return (
      <Box sx={{ mt: 4, p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          No shift data available.
        </Typography>
      </Box>
    );
  }

  const { profile, note, json_data } = state;
  const inventory = json_data?.inventory || {};
  const notes = json_data?.note || {};

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', mt: 2 }}>
      <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid var(--gc-border2)' }}>
        <Box
          sx={{
            px: 3, py: 2.5,
            background: 'linear-gradient(135deg, var(--gc-bg) 0%, var(--gc-bg2) 100%)',
            borderBottom: '1px solid var(--gc-border)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.main' }}>
            Shift — {profile?.username}
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          <InvoicePrint shift={json_data} profile={profile} />

          {Object.keys(notes).length > 0 && (
            <Paper elevation={0} sx={{ mt: 3, p: 2.5, borderRadius: 2, border: '1px solid var(--gc-border2)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'secondary.main', mb: 1 }}>
                Note: {note}
              </Typography>
              {Object.entries(notes).map(([key, value]) => (
                <Typography key={key} variant="body2" color="text.secondary">
                  {key}: {value}
                </Typography>
              ))}
            </Paper>
          )}

          {Object.keys(inventory).length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'secondary.main', mb: 2 }}>
                Inventory
              </Typography>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid var(--gc-border2)', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell align="right">Start</TableCell>
                      <TableCell align="right">Sold</TableCell>
                      <TableCell align="right">Sold at Square</TableCell>
                      <TableCell align="right">Refund</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(inventory).map(([itemName, itemData]) => {
                      const { start_shift, sold, sold_at_square, refund } = itemData;
                      const hasActivity = start_shift + sold + sold_at_square !== 0;
                      return (
                        hasActivity && (
                          <TableRow key={itemName}>
                            <TableCell component="th" scope="row">{itemName}</TableCell>
                            <TableCell align="right">{start_shift}</TableCell>
                            <TableCell align="right">{sold}</TableCell>
                            <TableCell align="right">{sold_at_square}</TableCell>
                            <TableCell align="right">{refund}</TableCell>
                          </TableRow>
                        )
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
