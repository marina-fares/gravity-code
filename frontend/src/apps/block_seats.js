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
    let [ blockSeats, setBlockSeats ] = useState({})
    let [ alert, setAlert ] = useState(false)
    let [ alertMessage, setAlertMessage ] = useState('')
   
    useEffect(()=>{
        const fetchData = (async()=>{
            const sessionData = await get_session_details(session_id)
            const currentSessionData = sessionData.find((session)=> session.id == session_id)
            setCurrentSessionDetails(currentSessionData)
            setBlockSeats(currentSessionData.block_seats_obj)
            console.log(currentSessionData.block_seats_obj)
            console.log(currentSessionData.block_seats_obj.number)
        })
        fetchData()
    },[session_id])

    const block_seats = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {

        if (!blockSeats.number || isNaN(blockSeats.number) ) {
        throw new Error("Invalid number of seats");
        }

        // current_session = 
        const currentSession = await {
            ...currentsessionDetails,
            block_seats_obj: blockSeats
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
            <div className='m-5 p-5'>
            <LoadingFun open={isLoading} />
            <AlertFun open_alert={alert} set_open_alert={setAlert} message={alertMessage} setLoading={setIsLoading} />

            <form className="flex-column d-flex justify-content-center"  onSubmit={(e) => block_seats(e)} >
                <div className="d-flex flex-row">
                    <TextField
                        required
                        id="Note"
                        label="Block Note"
                        onChange={(e) =>
                            setBlockSeats(prev => ({
                                ...prev,
                                note: e.target.value
                            }))
                        }
                        value={(blockSeats?.note === 'none')? '': blockSeats?.note }
                        sx={{ flex: 1, mr: 1 }}
                    />
                    <TextField
                        required
                        id="Number"
                        label="Block Number"
                        onChange={(e) =>
                            setBlockSeats(prev => ({
                                ...prev,
                                number: Number(e.target.value)
                            }))
                            
                        }
                        value={blockSeats?.number }
                        sx={{ flex: 1 }}
                    />
                </div>
                <Button
                    size="small"
                    variant="outlined"
                    style={{ padding: "2px 6px", minWidth: "auto" }}
                    type="submit"
                    className="mt-2"
                >
                    Save
                </Button>
            </form>

            </div>

            
            }
        </>
    )
}