import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TextField } from '@mui/material';
import Card from 'react-bootstrap/Card';

import { app_get } from '../../components/logic/app';
import  LoadingFun from '../../components/ui/loading'

export default function OldShift(){

  
    const [all_shifts, set_all_shifts] = useState([]);
    const [selected_date, set_selected_date] = useState(new Date());
    const [is_loading, set_is_loading] = useState(false)

	const navigate = useNavigate()

      
    const fetchall_shifts = async () => {
        set_is_loading(true)
        const shifts = await app_get('old_shift/');
        set_all_shifts(shifts);
        set_is_loading(false)
    };
      
    useEffect(() => {
        fetchall_shifts();
    }, []);
      

    return (
    <div className="m-2">
        <LoadingFun open={is_loading} message='Please wait, we are extracting the shift history.' />
        <div className="mb-4">
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                label="Select Date"
                value={selected_date}
                onChange={(newDate) => set_selected_date(new Date(newDate))}
                renderInput={(params) => <TextField {...params} />}
                />
            </LocalizationProvider>
        </div>

        {all_shifts.length > 0  ? 
        (all_shifts?.filter((item) => {
        const itemDate = new Date(item.date);
        return (
            itemDate.getDate() === selected_date.getDate() &&
            itemDate.getMonth() === selected_date.getMonth()
        );
        }).map((item) => {
            let datetime = new Date(item.json_data.start_time)
        return(<div key={item.date} className="mb-3">
            <Card
            className="m-2"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/one_old_shift', { state: item })}
            >
            <Card.Header>
                {datetime.toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
                })} - {item.profile?.username}
            </Card.Header>
            </Card>
        </div>)
        })) :
        (
            <div>
                You're not Authorized to see the shift history
            </div>
        )

        }
    </div>
    );
}
