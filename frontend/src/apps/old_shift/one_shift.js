import { useLocation } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Paper from '@mui/material/Paper';
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
        return <div>No shift data available.</div>;
    }

    const { profile, note, json_data } = state;
    const inventory = json_data?.inventory || {};
    const notes = json_data?.note || {};

    return (
        <Card.Body className="container">
            <h4>{profile?.username}</h4>

            <InvoicePrint shift={state.json_data} profile={state.profile}/>

            {Object.keys(notes).length > 0 && (
                <Card.Text>
                    <h4 align="left">Note: {note}</h4>
                    {Object.entries(notes).map(([key, value]) => (
                        <div key={key} align="left">
                            {key}: {value}
                        </div>
                    ))}
                </Card.Text>
            )}

            {Object.keys(inventory).length > 0 && (
                <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} size="small" aria-label="Inventory Table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell align="right">Start</TableCell>
                                <TableCell align="right">Sold</TableCell>
                                <TableCell align="right">Sold At Square</TableCell>
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
            )}
        </Card.Body>
    );
}
