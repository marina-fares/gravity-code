import { Avatar, Grid, IconButton, ListItem, ListItemAvatar, ListItemText, List as Mulist, CardContent, Typography, CardActions, Button, CardHeader } from '@mui/material';
import { Container } from '@mui/system';
import { Fragment } from 'react';
import Card from 'react-bootstrap/Card';
import { useNavigate } from 'react-router-dom';
import { app_api_get } from '../../../components/logic/apis';
import { set_localstorage } from '../../../components/logic/localstorage';


export default function List({ data, session_type }) {
	const navigate = useNavigate();
// localstorage => session_type, get sessions ID of the next two sessions

	async function card_click_handle(eventId, startTime){
		set_localstorage('booking_session_object', JSON.stringify(session_type) )
		console.log('hey hey ana el card', session_type)
		console.log(startTime)
		await extract_three_sessions(session_type, startTime)
		navigate(`/book/${eventId}`)
	}	

	function extract_three_sessions(session_type, startTime){
		
		startTime = new Date(startTime)
		startTime.setHours(startTime.getHours() + 1)

		let endTime = new Date(startTime)
		endTime.setHours(endTime.getHours() + 6)
		endTime = endTime.toISOString()
		console.log(endTime);
		console.log("the list page")
		//  console.log(date, session_type, startTime, endTime) 
		app_api_get('bookeo/', {
		  "request_type": "get",
		  "url": "/availability/slots",
		  "payload": { "startTime": startTime , "endTime" : endTime,productId: session_type.productId},
		}).then(response => {

			set_localstorage('three_sessions', JSON.stringify(response))
		})
	}
	return (
		<Fragment>
			
				<Mulist className="m-5">
					{data && data.length >0 &&
						data.map((item) => {
							let start_time =  new Date(item.startTime)
							start_time.setHours(start_time.getHours() -1)
							let end_time = new Date(item.endTime)
							return (

								<div className="" key={item.eventId} style={{marginBottom: '25px',}}>
                                <Card key={item.eventId} className="m-2" style={{ cursor: "pointer" }} onClick={()=>{card_click_handle(item.eventId, item.startTime)}} >
                                <Card.Header>Session  {session_type.name} </Card.Header>
                                <Card.Body className="container">
                                  <Card.Title> {start_time.toLocaleString()} </Card.Title>
									<div className="row" style={{marginBottom: '10px'}}>
									<div className="col-sm">
										Slots Available: {item.numSeatsAvailable} 
									</div>
									</div>
								  
                                </Card.Body>
                              </Card>
							  
							  </div>
                                
							);
						})}
						{data.length === 0  && "There Is nothing to show"}
				</Mulist>
		</Fragment>
	);
}
