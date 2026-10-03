import React, { useRef } from 'react';
import ReactToPrint from 'react-to-print';
import { Row, Col } from 'react-bootstrap';
import { get_user_and_jwt } from '../logic/users';

import { Input } from '@mui/material';
import Booking from '../../apps/booking';
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


const today = new Date(shift?.dateTime || '') 
	return shift && <div ref={ref} style={{ width: '80mm' }}>
				{shift.status && shift.status == 'refunded' && <span><strong> This Booking is refunded by {shift.refunded_by_username} </strong></span>}
				<PageHeader title={shift.branch_name} />
				<PaperRow key={`${shift.location_name} - ${today.toLocaleString('default', { month: 'long' })}`  } right={`${shift.location_name}`} left={`${today.toLocaleString('default', { month: 'long' })} ${today.getDate()}, ${today.getFullYear()}`} />
				<PaperRow key={shift.city} right={`${shift.city}`} left={`${today.getHours() % 12 || 12}:${today.getMinutes()} ${(today.getHours()>= 12)? 'PM' : 'AM'}`} />
				<PaperRow key={'user'} right={`User`} left={shift.creation_agent} />

				<hr style={{ margin: '10px' }} />
				<PaperRow key={shift.square_receipt_number} right={ ` Receipt: ${shift.square_receipt_number}`} />
				{shift.discount && <PaperRow key={shift.discount} right={ ` Discount: ${shift.discount}`} />}
				<hr style={{ margin: '10px' }} />
				
				{shift.options && Object.keys(shift.options).length > 0 &&
				shift.options.map((res) => {
					if (Number(res.quantity) > 0) {
					return (
						<PaperRow
						key={`${res.id}-${res.name}`}
						right={res.name}
						right_bold={true}
						left={`${res.quantity}  *   ${res.base_price_money.amount / 100}`}
						/>
					);
					}
					return null; // ensure a value is always returned
				})}

				
				<hr style={{ margin: '10px' }} />
				<PaperRow key={shift.total_price} right='Total' right_bold={true} left={`E£${(shift.total_price)}.00`} left_bold={true} />
				
				{(shift.first_paid !== "") && 
				<PaperRow key={shift.first_paid_method} right={`${(shift.first_paid_method === "CASH" || shift.first_paid_method === "cash")? "cash" : "creditcard"}`} right_bold={true} left={`E£${shift.first_paid}.00`} left_bold={true} />
				}
				<PaperRow key='123' right='Change' right_bold={true} left={`E£0.00`} left_bold={true} />
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
	
	return (
		<div className='container border-0'>


			<div style={{ border: '1px solid #000', padding: '10px', margin: '10px', width: '90mm' }}>
			
				<Invoice ref={componentRef} shift={shift} note={note} />
			</div>
			<Input
				className='form-control d-flex flex-column justify-content-end w-25'
				value={note}
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
