import * as React from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

// import Date from datetime
import List from "./List";

export default function MaterialUIPickers() {
  const [value, set_value] = React.useState(new Date());
  const [inputText, setInputText] = React.useState("");
  

  let inputHandler = (e) => {
    var lowerCase = e.target.value;
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