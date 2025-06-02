import { Button, TextField } from '@mui/material';
import { useState } from 'react';
import { useEffect } from 'react';
import { app_post, app_put } from '../components/logic/app';
import { useParams } from 'react-router-dom';
import LoadingFun from '../components/ui/loading';
import { useNavigate } from 'react-router-dom';
import { get_session_details } from './booking/functions_apis';
import AlertFun from '../components/ui/alert';

export default function SessionCapacity(){

    const navigate = useNavigate();
    let { session_id } = useParams()
    let [ isLoading, setIsLoading ] = useState()
    let [ sessionDetails, setSessionDetails ] = useState()
    let [ sessionCapacity, setSessionCapacity ] = useState()
    let [ addedSeats, setAddedSeats ] = useState()
    let [ alert, setAlert ] = useState(false)
    let [ alertMessage, setAlertMessage ] = useState('')
   
    useEffect(()=>{
        const fetchData = (async()=>{
            const sessionData = await get_session_details(session_id)
            setSessionDetails(sessionData[0])
            setSessionCapacity((sessionData[0].session_capacity)?sessionData[0].product.max_num : sessionData[0].session_capacity)
        })
        fetchData()
    },[session_id])

    const change_capacity = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {

        // if (!addedSeats || isNaN(addedSeats) || Number(addedSeats) <= 0) {
        // throw new Error("Invalid number of seats");
        // }

        // const data = { numbers: sessionCapacity };
        sessionDetails.added_seats = await addedSeats
        console.log(sessionDetails)
        await app_put(`session/${session_id}/`,{}, sessionDetails);
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
            {sessionDetails && 
            <form className="p-5 m-5 flex-column d-flex justify-content-center" >
            <LoadingFun open={isLoading} />
            <AlertFun open_alert={alert} set_open_alert={setAlert} message={alertMessage} setLoading={setIsLoading} />
            <h4>Session Capacity: {sessionDetails.product.max_num}</h4>
            <TextField
                id="outlined-helperText"
                label="Added Seats"
                defaultValue={sessionDetails.added_seats}
                onChange={(e) => setAddedSeats(e.target.value)}
                helperText=""
            />

            <Button
                size="small"
                variant="outlined"
                style={{ padding: "2px 6px", minWidth: "auto" }}
                onClick={(e)=> change_capacity(e)}
                type="submit"
            >
                Save
            </Button>
            </form>

            
            }
</>
    )
}