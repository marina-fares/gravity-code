import * as React from 'react';
import dayjs from 'dayjs';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
// import Date from datetime
import List from "./List";

export default function MaterialUIPickers() {
  const [value, set_value] = React.useState(new Date());
  const [inputText, setInputText] = React.useState("");
  

  let inputHandler = (e) => {
    //convert input text to lower case
    var lowerCase = e.target.value;
    console.log(lowerCase)
    setInputText(lowerCase);
  };

  return (
    <div className="main">
      <h4>Search By The Receipt Code</h4>
      <LocalizationProvider dateAdapter={AdapterDayjs} className = "m-4">
        <Stack spacing={5} >
          <DateTimePicker
            format='MM/dd/yyyy h:mm aa'
            renderInput={(params) => <TextField {...params} />}
            
            value={value}
            onChange={(date) => {
              const d2 = (new Date(date).toISOString());
              
              // console.log(d2)
              set_value(d2)
            }
            }
            
          />
        </Stack>
      </LocalizationProvider>
        
        <div className="search">
        <TextField
            id="outlined-basic"
            onChange={inputHandler}
            variant="outlined"
            fullWidth
            label="Search"
          />
        </div>
        <List input={inputText} start_time = {value}/>

    
    </div>
  );
}