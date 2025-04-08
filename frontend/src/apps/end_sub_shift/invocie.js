import React, { useRef } from 'react';
import ReactToPrint, { PrintContextConsumer } from 'react-to-print';
import { Row, Col, Button } from 'react-bootstrap';
import { get_user_and_jwt } from '../../components/logic/users';
import { Input } from '@mui/material';
import { useEffect } from 'react';
import { get_shift, set_shift_fun } from './shifts_functions';
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

const Invoice = React.forwardRef(({ shift, cash, visa, sub_shift }, ref) => {




	let start_date = new Date(sub_shift?.start_time);
	let end_date = new Date(sub_shift?.end_time);
	let total_in_out = sub_shift?.shift_money_cash - sub_shift?.refund_cash;
	let in_drawer_cash = sub_shift?.start_shift_cash + total_in_out;
	let actual_in_drawer_cash = cash;
	let difference_cash = actual_in_drawer_cash  - in_drawer_cash ;
	let in_drawer_visa = sub_shift?.shift_money_visa;
	let actual_in_drawer_visa = visa;
	let difference_visa =  actual_in_drawer_visa - in_drawer_visa + sub_shift?.refund_visa;
	let user = get_user_and_jwt().user;
	console.log("Invoice");
	console.log(user)
	let inventory = sub_shift?.inventory;
	return (
		<div ref={ref} style={{ width: '80mm' }}>
			<PageHeader title={`Drawer Report: ${shift.branch_name} - ${user.username} `} />
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
				text={`End Time: ${new Date().toLocaleString('en-US', {
					month: 'short',
					day: '2-digit',
					year: 'numeric',
					hour: 'numeric',
					minute: 'numeric',
					hour12: true,
				})} `}
			/>
			<FullPageRow text={`${shift?.branch_name}`} />
			<hr style={{ margin: '10px' }} />
			<FullPageRow text='Summary' />
			<hr style={{ margin: '10px' }} />
			<PaperRow right='Starting Cash' left={`${sub_shift?.start_shift_cash}`} />
			<PaperRow right='Cash Sales' left={`${sub_shift?.shift_money_cash}`} />
			<PaperRow right='Visa Sales' left={`${sub_shift?.shift_money_visa}`} />
			<PaperRow right='Cash Refunds' left={`${sub_shift?.refund_cash}`} />
			<PaperRow right='Visa Refunds' left={`${sub_shift?.refund_visa}`} />
			<PaperRow right='Expected In Drawer Cash' left={`${in_drawer_cash}`} left_bold={true} right_bold={true} />
			<PaperRow right='Actual In Drawer Cash' left={cash} left_bold={true} right_bold={true} />
			<PaperRow right='Difference Cash' left={`${difference_cash}`} left_bold={true} right_bold={true} />
			<PaperRow right='Actual In Drawer Visa' left={visa} left_bold={true} right_bold={true} />
			<PaperRow right='Difference Visa' left={`${difference_visa}`} left_bold={true} right_bold={true} />

		</div>
	);
});



export const InvoicePrint = ({ shift , sub_shift }) => {
	const componentRef = useRef();
	const componentRef_full_shift = useRef();
	const [cash, set_cash] = React.useState(0);
	const [visa, set_visa] = React.useState(0);
	// const [updated_shift, set_updated_shift] = React.useState(JSON.parse(get_localstorage('shift')));
	
	useEffect(() => {
		sub_shift.actual_cash = parseInt(cash)
		sub_shift.actual_visa = parseInt(visa)
		console.log("invoice print")
		console.log(sub_shift)
		set_shift_fun(shift)
		
		}, [cash, visa]);
		

	console.log(shift);
	return (
		<div>


			<label style={{ margin: '10px' }} className=' d-flex flex-column justify-content-end w-25'>Actual In Drawer Cash</label>
			<Input
				className='form-control d-flex flex-column justify-content-end w-25'
				defaultValue={1}
				onChange={(e) => set_cash(e.target.value)}
				type='number'
				name='cash'
				label='cash'
				value={cash}
				// step='0'
			/>
			<label style={{ margin: '10px' }} className=' d-flex flex-column justify-content-end w-25'>Actual In Drawer Visa</label>
			<Input
				className='form-control d-flex flex-column justify-content-end w-25'
				defaultValue={1}
				onChange={(e) => set_visa(e.target.value)}
				type='mumber'
				name='visa'
				label='Visa'
				value={visa}
				// step='0'
			/>
			

			<div className ="d-flex justify-content-center w-100">

				 <div  style={{ border: '1px solid #000', padding: '10px', margin: '10px' }}  >
					<text>Sub Shift Receipt {shift.sub_shift_round}</text>
					<Invoice ref={componentRef} shift={shift} cash={cash} visa={visa} sub_shift={sub_shift} className ="d-flex justify-content-start"/>
					<ReactToPrint
						trigger={() => (
							<button style={{ margin: '10px' }} className='btn btn-outline-dark'>
								Print Sub Shift
							</button>
						)}
						content={() => componentRef.current}
					/>
				</div>

			</div>
		</div>
	);
};
