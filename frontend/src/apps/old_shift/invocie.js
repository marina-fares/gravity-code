import React, { useRef } from 'react';
import ReactToPrint, { PrintContextConsumer } from 'react-to-print';
import { Row, Col, Button } from 'react-bootstrap';
import { get_user_and_jwt } from '../../components/logic/users';
import { Input } from '@mui/material';
import { useEffect } from 'react';
import { get_shift } from '../Enventory/shifts_functions';
import { useState } from 'react';
import { get_localstorage, set_localstorage } from '../../components/logic/localstorage';

const PaperRow = ({ right, right_bold, left, left_bold }) => {
	if (right_bold) {
		right = <b>{right}</b>;
	}
	if (left_bold) {
		left = <b>{left}</b>;
	}
	return (
		<Row style={{ margin: '0 0 0px 0' }}>
			{right && (
				<Col xs={8} style={{ textAlign: 'left' }}>
					{right}
				</Col>
			)}
			{left && (
				<Col xs={4} style={{ textAlign: 'right' }}>
					{left}
				</Col>
			)}
		</Row>
	);
};

const FullPageRow = ({ text, bold, styles }) => {
	if (bold) {
		text = <b>{text}</b>;
	}

	return (
		<Row style={{ ...styles, margin: '0 0 0px 0' }}>
			<Col xs={12} style={{ textAlign: 'left' }}>
				{text}
			</Col>
		</Row>
	);
};

const PageHeader = ({ title }) => {
	return (
		<Row style={{ margin: '10px 0 0px 0' }}>
			<Col xs={12} style={{ textAlign: 'left' }}>
				<h6 style={{ margin: '0 0 0px 0' }}>{title}</h6>
			</Col>
		</Row>
	);
};



const Invoice = React.forwardRef(({ shift }, ref) => {

	let start_date = new Date(shift?.json_data.start_time);
	let end_date = new Date(shift?.json_data.end_time);
	let total_in_out = shift?.json_data.shift_money_cash - shift?.json_data.refund_cash;
	let in_drawer_cash = shift?.json_data.start_shift_cash + total_in_out;
	let actual_in_drawer_cash = shift?.json_data.actual_cash;
	let difference_cash = actual_in_drawer_cash  - in_drawer_cash ;
	let in_drawer_visa = shift?.json_data.shift_money_visa;
	let actual_in_drawer_visa = shift?.json_data.actual_visa;
	let difference_visa =  actual_in_drawer_visa - in_drawer_visa + shift?.json_data.refund_visa;
	let inventory = shift?.json_data.inventory;
	// let options
	let [userShift, set_userShift] = useState();
	useEffect(() => {
		let shit_data = get_shift();		  
			shit_data.then((x) => {
			set_userShift(x)
			console.log(Object.keys(x.options))
			})
		},[])
	return (
		<div ref={ref} > 
			<PageHeader title={`Drawer Report: ${shift.json_data.branch_name} - ${shift.profile.username} `} />
			<FullPageRow
				text={`Start Time: ${start_date.toLocaleString('en-US', {
					month: 'short',
					day: '2-digit',
					year: 'numeric',
					hour: 'numeric',
					minute: 'numeric',
					hour12: true,
				})} `}
			/>
			<FullPageRow
				text={`End Time: ${end_date.toLocaleString('en-US', {
					month: 'short',
					day: '2-digit',
					year: 'numeric',
					hour: 'numeric',
					minute: 'numeric',
					hour12: true,
				})} `}
			/>
			<FullPageRow text={`${shift?.json_data.branch_name}`} />
			<hr style={{ margin: '10px' }} />
			<FullPageRow text='Summary' />
			<hr style={{ margin: '10px' }} />
			<PaperRow right='Starting Cash' left={`${shift?.json_data.start_shift_cash}`} />
			<PaperRow right='Cash Sales' left={`${shift?.json_data.shift_money_cash}`} />
			<PaperRow right='Visa Sales' left={`${shift?.json_data.shift_money_visa}`} />
			<PaperRow right='Cash Refunds' left={`${shift?.json_data.refund_cash}`} />
			<PaperRow right='Visa Refunds' left={`${shift?.json_data.refund_visa}`} />
			<PaperRow right='Expected In Drawer Cash' left={`${in_drawer_cash}`} left_bold={true} right_bold={true} />
			<PaperRow right='Actual In Drawer Cash' left={actual_in_drawer_cash} left_bold={true} right_bold={true} />
			<PaperRow right='Difference Cash' left={`${difference_cash}`} left_bold={true} right_bold={true} />
			<PaperRow right='Actual In Drawer Visa' left={actual_in_drawer_visa} left_bold={true} right_bold={true} />
			<PaperRow right='Difference Visa' left={`${difference_visa}`} left_bold={true} right_bold={true} />
			<hr style={{ margin: '10px' }} />
			<FullPageRow text='Inventory' />
			<hr style={{ margin: '10px' }} />
			{inventory &&
				Object.keys(inventory).map((key, index) => {return(

					 inventory[key].sold_at_square + inventory[key].sold  !== 0 &&	<div> 	 {
						<PaperRow right={key} left={`${inventory[key]?.sold + inventory[key]?.sold_at_square}/${inventory[key]?.start_shift}`} />
					}</div>

				)})}
{/* inventory[key].sold + inventory[key].sold_at_square + inventory[key].start_shift == 0 } */}
		</div>
	);
});


const Sec_Invoice = React.forwardRef(({ shift }, ref) => {




	let start_date = new Date(shift?.json_data.start_time);
	let end_date = new Date(shift?.json_data.end_time);
	let total_in_out = shift?.json_data.shift_money_cash - shift?.json_data.refund_cash;
	let in_drawer_cash = shift?.json_data.start_shift_cash + total_in_out;
	let actual_in_drawer_cash = shift?.json_data.actual_cash;
	let difference_cash = actual_in_drawer_cash  - in_drawer_cash ;
	let in_drawer_visa = shift?.json_data.shift_money_visa;
	let actual_in_drawer_visa = shift?.json_data.actual_visa;
	let difference_visa =  actual_in_drawer_visa - in_drawer_visa + shift?.json_data.refund_visa;
	let user = get_user_and_jwt().user;
	let [userShift, set_userShift] = useState();
	useEffect(() => {
		let shit_data = get_shift();		  
			shit_data.then((x) => {
			set_userShift(x)
			console.log(Object.keys(x.options))
			})
			console.log("user11111")
			console.log(get_user_and_jwt().user)
			console.log(shift)
		},[])

	let inventory = shift?.json_data.inventory;
	return (
		<div ref={ref} > 
			<PageHeader title={`Drawer Report: ${shift.json_data.branch_name} - ${shift.profile.username} `} />
			<FullPageRow
				text={`Start Time: ${start_date.toLocaleString('en-US', {
					month: 'short',
					day: '2-digit',
					year: 'numeric',
					hour: 'numeric',
					minute: 'numeric',
					hour12: true,
				})} `}
			/>
			<FullPageRow
				text={`End Time: ${end_date.toLocaleString('en-US', {
					month: 'short',
					day: '2-digit',
					year: 'numeric',
					hour: 'numeric',
					minute: 'numeric',
					hour12: true,
				})} `}
			/>
			<FullPageRow text={`${shift?.json_data.branch_name}`} />
			<hr style={{ margin: '10px' }} />
			<FullPageRow text='Summary' />
			<hr style={{ margin: '10px' }} />
			<PaperRow right='Starting Cash' left={`${shift?.json_data.start_shift_cash}`} />
			<PaperRow right='Cash Sales' left={`${shift?.json_data.shift_money_cash}`} />
			<PaperRow right='Visa Sales' left={`${shift?.json_data.shift_money_visa}`} />
			<PaperRow right='Cash Refunds' left={`${shift?.json_data.refund_cash}`} />
			<PaperRow right='Visa Refunds' left={`${shift?.json_data.refund_visa}`} />
			<PaperRow right='Expected In Drawer Cash' left={`${in_drawer_cash}`} left_bold={true} right_bold={true} />
			<PaperRow right='Actual In Drawer Cash' left={actual_in_drawer_cash} left_bold={true} right_bold={true} />
			<PaperRow right='Difference Cash' left={`${difference_cash}`} left_bold={true} right_bold={true} />
			<PaperRow right='Actual In Drawer Visa' left={actual_in_drawer_visa} left_bold={true} right_bold={true} />
			<PaperRow right='Difference Visa' left={`${difference_visa}`} left_bold={true} right_bold={true} />
			<hr style={{ margin: '10px' }} />
			<FullPageRow text='Inventory' />
			<hr style={{ margin: '10px' }} />
			{inventory &&
				Object.keys(inventory).map((key, index) => { return( 
			userShift &&  userShift.options && Object.keys(userShift.options).includes(key) &&  <PaperRow right={key} left={`${inventory[key]?.sold + inventory[key]?.sold_at_square}/${inventory[key]?.start_shift}`} /> 
			)})}
			
		</div>
	);
});


export const InvoicePrint = ({ shift } ) => {
	const componentRef = useRef();
	let [userShift, set_userShift] = useState();
	useEffect(() => {
		let shit_data = get_shift();		  
			shit_data.then((x) => {
			set_userShift(x)
			console.log(Object.keys(x.options))
			})
		},[])

	return (
		<div class="container w-100">
			<div class="row w-50">

					<div style={{ border: '1px solid #000'}}>
						<Invoice ref={componentRef} shift={shift}   />
						<ReactToPrint
						trigger={() => (
							<button style={{ margin: '10px' }} className='btn btn-outline-dark'>
								Print
							</button>
						)}
						content={() => componentRef.current}
						/>
					</div>


	
			
			</div>
		</div>
	);
};


