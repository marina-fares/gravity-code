import { Button, Grid, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import Card from 'react-bootstrap/Card';
import { useNavigate } from 'react-router-dom';
import { get_shift, get_sub_shift, set_shift, set_sub_shift } from '../../components/logic/shifts_functions_apis';
import { get_catalog } from '../../components/logic/shifts_functions';
import { app_api_post } from '../../components/logic/apis';
import LoadingFun from '../../components/ui/loading';
import AlertFun from '../../components/ui/alert'

export default function StartShift() {
    const [shift_details, set_shift_details] = useState({});
    const [sub_shift_details, set_sub_shift_details] = useState({});
    const [catalog, set_catalog_details] = useState(null);
    const [open, setOpen] = useState(false);
    const [alert, setAlert] = useState(false);
    const [error_message, set_error_message] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        get_catalog().then((response) => set_catalog_details(response));
        get_sub_shift().then((data) => set_sub_shift_details(data));
    }, []);

    useEffect(() => {
        if (catalog) {
            get_shift().then((shiftData) => {
                if (shiftData && shiftData.start_time && !shiftData.end_time && shiftData.current_shift_id !== null) {
                    navigate('/home');
                }
                initializeShiftInventory(shiftData);
                set_shift_details(shiftData);
            });
        }
    }, [catalog]);

    const initializeShiftInventory = (shiftData) => {
        const inventory = {};
        catalog.objects.forEach((item) => {
            if (item.type === 'ITEM') {
                const itemName = item?.item_data?.name;
                inventory[itemName] = {
                    start_shift: 0,
                    sold: 0,
                    sold_at_square: 0,
                    refund: 0,
                    id: item.item_data.variations[0].id,
                };
            }
        });
        shiftData.inventory = inventory;
    };



    const onStartShift = () => {
        setOpen(true);
        const date = new Date().toISOString();
        app_api_post('square/', {
            request_type: 'post',
            url: '/labor/shifts',
            payload: {
                shift: {
                    wage: {},
                    status: 'OPEN',
                    location_id: shift_details.square_location_id,
                    start_at: date,
                    team_member_id: shift_details.square_team_member_id,
                },
            },
        }).then((res) => {
            if (res.errors) {
                setOpen(false);
                setAlert(true);
                set_error_message(`${res.errors[0].detail} ${res.errors[0].field}`);
            } else {
                updateShiftData(res, date);
                navigate('/home');
                setOpen(false);
            }
        });
    };

	const updateShiftData = async (res, date) => {
		shift_details.start_time = date;
		shift_details.sub_shift_round = 1;
		shift_details.end_time = null;
		shift_details.current_shift_id = res?.shift?.id;
	
		sub_shift_details.start_time = date;
		sub_shift_details.end_time = null;
		sub_shift_details.current_shift_id = res?.shift?.id;
	
		set_shift({ ...shift_details });
		set_sub_shift({ ...sub_shift_details });
	};

    const updateMoney = (money) => {
        shift_details.start_shift_cash = Number(money);
        set_shift_details({ ...shift_details });
		
        sub_shift_details.start_shift_cash = Number(money);
        set_sub_shift_details({ ...sub_shift_details });
    };

    const updateInventory = (key, value) => {
        shift_details.inventory[key].start_shift = value ? parseInt(value) : 0;
        set_shift_details({ ...shift_details });
    };

    return (
        <Card style={{ marginTop: 100 }}>
            <LoadingFun open={open} />
			<AlertFun open_alert={alert} set_open_alert={setAlert} message={error_message} />
            <Card.Body>
                <Card.Title>Start Shift</Card.Title>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            label="Money"
                            value={`${shift_details.start_shift_cash}`}
                            onChange={(e) => updateMoney(e.target.value)}
                            inputMode="numeric"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Card.Title>Inventory</Card.Title>
                        <Grid container spacing={2}>
                            {shift_details.inventory &&
                                Object.keys(shift_details.inventory).map((key) => (
                                    <Grid item xs={12} md={6} lg={4} key={key}>
                                        <div className="m-2" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <span style={{ width: 100 }}>{key}</span>
                                            <TextField
                                                inputMode="numeric"
                                                label={key}
                                                defaultValue={shift_details.inventory[key].start_shift || ' '}
                                                onChange={(e) => updateInventory(key, e.target.value)}
                                            />
                                        </div>
                                    </Grid>
                                ))}
                        </Grid>
                    </Grid>
                </Grid>
                <Grid container spacing={2}>
                    <Grid item xs={12} style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                        <Button variant="outlined" onClick={onStartShift}>
                            Start
                        </Button>
                    </Grid>
                </Grid>
            </Card.Body>
        </Card>
    );
}
