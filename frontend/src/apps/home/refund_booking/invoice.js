import React, { useRef } from 'react';
import ReactToPrint, { PrintContextConsumer } from 'react-to-print';
import { Row, Col, Button } from 'react-bootstrap';
import { get_user_and_jwt } from '../../../components/logic/users';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { Input } from '@mui/material';
const PaperRow = ({ right, right_bold, left, left_bold }) => {
	if (right_bold) {
		right = <b>{right}</b>;
	}
	if (left_bold) {
		left = <b>{left}</b>;
	}
	return (
		<Row style={{ margin: '0 0 0px 0' }}>
			{right && <Col xs={6}>{right}</Col>}
			{left && (
				<Col xs={6} style={{ textAlign: 'right' }}>
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
			<Col xs={12} style={{ textAlign: 'center' }}>
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

const Invoice = React.forwardRef(({shift, note}, ref) => {
console.log("shifttttttttttt")
console.log(get_user_and_jwt().user)

const today = new Date()
	return <div ref={ref} style={{ width: '80mm' }}>
	<PageHeader title={shift.branch_name} />
	
		<PaperRow right={`${shift.location_name}`} left={`${today.toLocaleString('default', { month: 'long' })} ${today.getDate()}, ${today.getFullYear()}`} />
		<PaperRow right={`${shift.city}`} left={`${today.getHours() % 12 || 12}:${today.getMinutes()} ${(today.getHours()>= 12)? 'PM' : 'AM'}`} />
		<PaperRow right={`User`} left={get_user_and_jwt().user.username} />
		<PaperRow right='' left="" />
		{/* <PaperRow right='12315' /> */}
		<hr style={{ margin: '10px' }} />
		<PaperRow right={ ` Receipt: ${shift.square_receipt_number}`} />
		{ shift.promocode && <PaperRow right={ ` Discount: ${shift.promocode.description}`} />
}		<hr style={{ margin: '10px' }} />
		
		{shift.options &&

		shift.options.map((res)=>{ if(res.quantity !== '0')
			return <PaperRow right={res.name} right_bold={true} left={`${res.quantity}  *   ${res.total_money.amount/100}  `} />
		    
		})
		
		}
		
		<hr style={{ margin: '10px' }} />
		<PaperRow right='Total' right_bold={true} left={`E£${(shift.total_price)}.00`} left_bold={true} />
		
		{(shift.first_paid !== "") && 
		<PaperRow right={`${shift.first_paid_method == "CASH"? "Cash" : "CreditCard"}`} right_bold={true} left={`E£${shift.first_paid}.00`} left_bold={true} />
		// <PaperRow right='Change' right_bold={true} left={shift.first_paid} left_bold={true} />
		}


<PaperRow right='Change' right_bold={true} left={`E£0.00`} left_bold={true} />
		{ note &&
		<FullPageRow text={`${note}`}  />
		}		
		<FullPageRow text='Series Fun!' bold={true} />
		<FullPageRow text='Including 14% Tax' bold={true} />
		<FullPageRow text='No Refund' bold={true} styles={{ marginTop: '10px' }} />
	</div>;
	
});

export const InvoicePrint = ({shift}) => {
	const componentRef = useRef();
	const [note, set_note] = React.useState();
	
	console.log(shift)
	return (
		<div className='container border-0'>


			<div style={{ border: '1px solid #000', padding: '10px', margin: '10px' }}>
			
				<Invoice ref={componentRef} shift={shift} note={note} />
			</div>
			<Input
				className='form-control d-flex flex-column justify-content-end w-25'
				defaultValue={1}
				onChange={(e) => set_note(e.target.value)}
				type='test'
				name='number of players'
				label='number of players'
				step=''
			/>

			<ReactToPrint
				trigger={() => (
						<div>
				<button style={{ margin: '10px' }} className='btn btn-outline-dark'>
				Print
			</button>


					</div>
				)}
				content={() => componentRef.current}
			/>
		</div>
		
	);
};
