import Invoice from "./Invoice";
import ReactToPrint from 'react-to-print';
import { useRef, forwardRef } from 'react';

const InvoicePrint = ({ shift , sub_shift, calculated_cash, calculated_visa }) => {
    const componentRef = useRef();
    const componentRef_full_shift = useRef();
    console.log(shift);
    return (
        <div>
            <div className ="d-flex justify-content-center w-100">

                 <div  style={{ border: '1px solid #000', padding: '10px', margin: '10px' }}  >
                    <text>{ sub_shift?
                    (<>Sub Shift Receipt {shift.sub_shift_round}</>)
                :
                (<>Full Shift</>)
                }</text>
                    <Invoice ref={componentRef} shift={shift} sub_shift={sub_shift} calculated_cash={calculated_cash} calculated_visa={calculated_visa} className ="d-flex justify-content-start"/>
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
