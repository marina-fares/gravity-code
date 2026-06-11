import {  List as Mulist } from '@mui/material';
import { Button } from '@mui/material';
import { Fragment } from 'react';
import Card from 'react-bootstrap/Card';
import { useNavigate } from 'react-router-dom';
import { set_localstorage } from '../../../components/logic/localstorage';
import { sessionDisplayDate } from '../../../components/logic/utils';

export default function List({ date, availableSessions, selectedProduct, add_block_seats }) {
	const navigate = useNavigate();

	async function list_old_bookings(session_id){

		set_localstorage('date', date )
		set_localstorage('session_type', selectedProduct )
		navigate(`/oldbookings/${session_id}`)
	}	



	return (
		<Fragment>
				<Mulist className="m-5" >
					{availableSessions && availableSessions.map((item) => {
							let datetime = sessionDisplayDate(item.start_time)

							return (
								<div key={item.id} style={{ marginBottom: '25px' }}>
									<Card className="m-2" style={{ cursor: "pointer" }} onClick={() => list_old_bookings(item.id)}>
										
										<Card.Header
										className="position-relative d-flex flex-column flex-md-row align-items-center px-3 py-2"
										style={{ minHeight: '48px' }} // enough height to avoid overlap
										>
										{/* Centered title with absolute positioning */}
										<div
											className="position-absolute w-100 text-center"
											style={{
											left: 0,
											right: 0,
											fontSize: "1rem",
											pointerEvents: "none",
											top: '50%',
											transform: 'translateY(-50%)',
											zIndex: 0,
											}}
										>
											Session {item.product.nick_name}
										</div>

										{/* Spacer to push buttons down on small screens */}
										<div className="d-md-none" style={{ height: '24px' }}></div>

										{/* Buttons container */}
										<div className="d-flex gap-2 flex-wrap justify-content-center justify-content-md-end w-100 w-md-auto" style={{ zIndex: 1 }}>
											<Button
											variant="outlined"
											style={{ padding: "2px 6px", minWidth: "100px" }}
											onClick={(e) => {
												e.stopPropagation();
												navigate(`/book/${item.id}`);
											}}
											>
											+
											</Button>
											<Button
											size="small"
											variant="outlined"
											style={{ padding: "2px 6px", minWidth: "auto" }}
											onClick={(e) => {
												e.stopPropagation();
												navigate(`/session_capacity/${item.id}`);
											}}
											>
											Session Capacity
											</Button>
											<Button
											size="small"
											variant="outlined"
											style={{ padding: "2px 6px", minWidth: "auto" }}
											onClick={(e) => {
												e.stopPropagation();
												navigate(`/block_seats/${item.id}`);
											}}
											>
											block
											</Button>

										</div>
										</Card.Header>

										<Card.Body className="container">
										<Card.Title>
										{datetime.getUTCFullYear()}-
										{String(datetime.getUTCMonth() + 1).padStart(2, '0')}-
										{String(datetime.getUTCDate()).padStart(2, '0')}{" "}
										{String((datetime.getUTCHours() % 12) || 12).padStart(2, '0')}:
										{String(datetime.getUTCMinutes()).padStart(2, '0')} {datetime.getUTCHours() >= 12 ? 'PM' : 'AM'}
										</Card.Title>

										<div className="column mb-2">
											<div className="col-sm ">
											Available Seats: {item.available_seats}
											</div>
											{item.block_seats_obj.number >0 && <div className="col-sm">
											Blocks: {item.block_seats_obj.number} - {item.block_seats_obj.note}
											</div>}
											{item.added_seats>0 && <div className="col-sm">
											Added Seats: {item.added_seats}
											</div>}
										</div>
										</Card.Body>
									</Card>
								</div>  
							);
						})}
						{availableSessions.length === 0  && "There Is nothing to show"}
				</Mulist>
		</Fragment>
	);
}
