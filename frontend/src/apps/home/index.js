import { Grid } from '@mui/material';
import { Fragment, useState } from 'react';
import AvailableSlots from './avaliable_slotes';
import HomeInput from './home_input';
import { useEffect } from 'react';
import { get_shift } from '../start_shift/shifts_functions';
import { get_localstorage, set_localstorage } from '../../components/logic/localstorage';
import { useNavigate } from 'react-router-dom';

export default function Home({shift}){

    const navigate = useNavigate()


    let [date, set_date] = useState();
    // all sessions type
    let [session_type , set_session_type] = useState();
    const [shift_data, set_shift_data] = useState();
    const [hide, set_hide] = useState();

    useEffect(() => {
        let x = get_shift();
        x.then((y)=> {
            (y.current_shift_id === null)?set_hide(true): set_hide(false)
           set_shift_data(y)
        })

    }, []);
   

    return (
        <>
            { shift_data && (shift_data.current_shift_id !== null) && (shift_data.start_time !== null) ? <Grid container spacing={2}>
                <Grid item xs={12} md={2} style={{marginTop:85}}>
                <HomeInput date={date} set_date={set_date} set_session_type={set_session_type}/>
                </Grid>
            
                <Grid item xs={12} md={10} style={{marginTop:30}}>
                    <h1>Available List</h1>
                    <AvailableSlots  date={date} session_type={session_type} />
                </Grid>
            </Grid>
            :
            <div>Loading Your shift..., If you haven't started your shift yet, kindly do so1.</div>
        }

            </>
    )
}