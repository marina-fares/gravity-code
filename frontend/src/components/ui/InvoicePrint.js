import Invoice from "./Invoice";
import ReactToPrint from 'react-to-print';
import { useRef } from 'react';
import { Typography } from '@mui/material';

const InvoicePrint = ({ shift , sub_shift, calculated_cash, calculated_visa, profile }) => {
    const componentRef = useRef();
    return (
        <div>
            <div className ="d-flex justify-content-center w-100">

                 <div  style={{ border: '1px solid #000', padding: '10px', margin: '10px' }}  >
                 <Typography variant="body1">{ sub_shift?
                    (<>Sub Shift Receipt {shift.sub_shift_round}</>)
                :
                (<>Full Shift</>)
                }</Typography>
                    <Invoice ref={componentRef} shift={shift} sub_shift={sub_shift} calculated_cash={calculated_cash} calculated_visa={calculated_visa} profile={profile} className ="d-flex justify-content-start"/>
                    <ReactToPrint
                        trigger={() => (
                            <button style={{ margin: '10px' }} className='btn btn-outline-dark'>
                                { sub_shift?
                                    (<>Print Sub Shift {shift.sub_shift_round}</>)
                                    :
                                    (<>Print Full Shift</>)
                                }
                            </button>
                        )}
                        content={() => componentRef.current}
                    />
                </div>

            </div>
        </div>
    );
};


export default InvoicePrint;
