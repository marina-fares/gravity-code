import { Grid } from '@mui/material';
import { useState } from 'react';
import AvailableSlots from './avaliable_slotes';
import HomeInput from './home_input';
import { useEffect } from 'react';
import {get_shift} from '../../components/logic/shifts_functions_apis';
import { get_product } from '../../components/logic/booking_functions';

import LoadingFun from '../../components/ui/loading';

export default function Home({shift}){

    let [date, setDate] = useState(new Date());
    let [allProducts , setAllProducts] = useState([]);
    let [selectedProduct, setSelectedProduct] = useState();
    const [ShiftDetails, SetShiftDetails] = useState();
    let [ isLoading, setIsLoading ] = useState()

    useEffect(() => {
		const fetchData = async () => {
			const shiftData = await get_shift();
			SetShiftDetails(shiftData);
            
            const productsData = await get_product()
            setAllProducts(productsData)
            setSelectedProduct(productsData[0])
            setIsLoading(false)

        };
        setIsLoading(true)
		fetchData();
    }, []);
   

    return (
        <>
            { ShiftDetails && (ShiftDetails.current_shift_id !== null) && (ShiftDetails.start_time !== null) ? 
            <Grid container spacing={2}>
                <LoadingFun open={isLoading} />
                <Grid item xs={12} md={2} style={{marginTop:85}}>
                <HomeInput date={date} setDate={setDate} allProducts={allProducts} selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct}/>
                </Grid>
            
                <Grid item xs={12} md={10} style={{marginTop:30}}>
                    <h1>Available List</h1>
                    <AvailableSlots  date={date} allProducts={allProducts} selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} />
                </Grid>
            </Grid>
            :
            <div>Loading Your shift..., If you haven't started your shift yet, kindly do so1.</div>
        }

            </>
    )
}