import {  List as Mulist } from '@mui/material';
import { Button } from '@mui/material';
import { Fragment } from 'react';
import Card from 'react-bootstrap/Card';
import { useNavigate } from 'react-router-dom';
import { set_localstorage } from '../../../components/logic/localstorage';

export default function List({ date, availableSessions, selectedProduct }) {
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
							return (
								<div className="" key={item.id} style={{marginBottom: '25px',}}>
                                <Card key={item.id} className="m-2" style={{ cursor: "pointer" }} onClick={()=>{list_old_bookings(item.id)}} >
									<Card.Header className="d-flex justify-content-between align-items-center px-3 py-2">
									{/* Centered Title */}
									<div className="flex-grow-1 text-center" style={{ fontSize: "1rem" }}>
										Session {selectedProduct.nick_name}
									</div>

									{/* Right-aligned Buttons */}
									<div className="d-flex gap-2" style={{ minWidth: "fit-content" }}>
										<Button size="small" variant="outlined" style={{ padding: "2px 6px", minWidth: "auto" }}>
										block
										</Button>
										<Button size="small" variant="outlined" style={{ padding: "2px 6px", minWidth: "auto" }}   onClick={(e) => {e.stopPropagation(); navigate(`/book/${item.id}`);}}>
										+
										</Button>
									</div>
									</Card.Header>

								
                                <Card.Body className="container">
                                  <Card.Title> {item.start_time.toLocaleString()} </Card.Title>
									<div className="row" style={{marginBottom: '10px'}}>
									<div className="col-sm">
										Slots Available: {item.available_seats} 
									</div>
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
