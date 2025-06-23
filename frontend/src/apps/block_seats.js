import { Button, TextField } from '@mui/material';
import { useState } from 'react';
import { useEffect } from 'react';
import { app_put } from '../components/logic/app';
import { useParams } from 'react-router-dom';
import LoadingFun from '../components/ui/loading';
import { useNavigate } from 'react-router-dom';
import { get_session_details } from './booking/functions_apis';
import AlertFun from '../components/ui/alert';

export default function BlockSeats(){

    const navigate = useNavigate();
    let { session_id } = useParams()
    let [ isLoading, setIsLoading ] = useState()
    let [ currentsessionDetails, setCurrentSessionDetails ] = useState()
    let [ blockSeats, setBlockSeats ] = useState(0)
    let [ alert, setAlert ] = useState(false)
    let [ alertMessage, setAlertMessage ] = useState('')
   
    useEffect(()=>{
        const fetchData = (async()=>{
            const sessionData = await get_session_details(session_id)
            const currentSessionData = sessionData.find((session)=> session.id == session_id)
            setCurrentSessionDetails(currentSessionData)
            setBlockSeats(currentSessionData.block_seats)
        })
        fetchData()
    },[session_id])

    const block_seats = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {

        if (!blockSeats || isNaN(blockSeats) ) {
        throw new Error("Invalid number of seats");
        }

        // current_session = 
        const currentSession = await {
            ...currentsessionDetails,
            block_seats: Number(blockSeats)
        };
        await app_put(`session/${session_id}/`,{}, currentSession);
        navigate('/');
    } catch (error) {

        setAlert(true)
        setAlertMessage(`Error blocking seats: ${error}`)
    } finally {
        setIsLoading(false);
    }
    };

    return (
        <>
            {currentsessionDetails && 
            <form className="p-5 m-5 flex-column d-flex justify-content-center" >
            <LoadingFun open={isLoading} />
            <AlertFun open_alert={alert} set_open_alert={setAlert} message={alertMessage} setLoading={setIsLoading} />

            <TextField
                id="outlined-helperText"
                label="Block Seats"
                value={blockSeats}
                onChange={(e) => setBlockSeats(e.target.value)}
                helperText=""
            />

            <Button
                size="small"
                variant="outlined"
                style={{ padding: "2px 6px", minWidth: "auto" }}
                onClick={(e)=> block_seats(e)}
                type="submit"
            >
                Save
            </Button>
            </form>

            
            }
</>
    )
}