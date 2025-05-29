import React, { useState } from "react";
import { create_order, create_payment_api } from "./functions_api";
import { useEffect } from "react";
import { get_shift } from "../../components/logic/shifts_functions_apis";
import { RadioGroup, FormControlLabel, Radio } from "@mui/material";
import LoadingFun from "../../components/ui/loading";
import AlertFun from "../../components/ui/alert";
import { useNavigate } from "react-router-dom";

export default function Keypad() {
    const navigate = useNavigate();
    const [input, setInput] = useState("");
    let [ shiftDetails, setShiftDetails] = useState('')
    let [ paymentMethod, setPaymentMethod] = useState('cash')
    let [ isLoading, setIsLoading ] = useState(false)
    let [ alertMessage, setAlertMessage ] = useState('')
    let [ alert, setAlert ] = useState(false)

    useEffect(()=>{
        const fetchData = async ()=>{
          const shiftData = await get_shift()
          setShiftDetails(shiftData)
        }
        fetchData()
    },[])

  const handleClick = (val) => {
    if (input.length < 10) setInput((prev) => prev + val);
  };

  const handleClear = () => setInput("");

  const handleSubmit = async () => {
    setIsLoading(true);
    setInput("");
    const amount = input;
    const orderDetails = await create_order({shiftDetails, amount})
    if(orderDetails.error)
    {
        setAlert(true);
        setAlertMessage(orderDetails.error);
        return;
    }
    const response2 = await create_payment_api({shiftDetails, orderDetails, paymentMethod})
    if(response2.error)
    {
        setAlert(true);
        setAlertMessage(response2.error);
        return;
    }
    navigate('/')
  };

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length <= 10) setInput(value);
  };

  const keys = [
    1, 2, 3,
    4, 5, 6,
    7, 8, 9,
    "Clear", 0, "Submit"
  ];

  return (
    <div style={styles.container}>
        <LoadingFun open={isLoading} />
        <AlertFun open_alert={alert} set_open_alert={setAlert} message={alertMessage} setLoading={setIsLoading} />
        <input
            type="text"
            value={input}
            onChange={handleInputChange}
            style={styles.input}
            placeholder="Enter number"
        />
        <div style={styles.grid}>
            {keys.map((key, idx) => (
            <button
                key={idx}
                onClick={() => {
                if (key === "Clear") handleClear();
                else if (key === "Submit") handleSubmit();
                else handleClick(key);
                }}
                style={{
                ...styles.button,
                background: key === "Submit" ? "#4caf50" : key === "Clear" ? "#f44336" : "#e0e0e0"
                }}
            >
                {key}
            </button>
            ))}
        </div>
        <RadioGroup
            row
            aria-labelledby="demo-row-radio-buttons-group-label"
            name="row-radio-buttons-group"
            onChange={(e) => {
                setPaymentMethod(e.target.value)}}
            defaultValue="cash"
        >
        <FormControlLabel value="cash" control={<Radio />} label="Cash" className="w-50" />
        <FormControlLabel value="creditcard" control={<Radio />} label="Credit" />
        </RadioGroup>
    </div>
  );
}

const styles = {
  container: {
    width: "220px",
    margin: "30px auto",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "12px",
    textAlign: "center",
    fontFamily: "Arial",
  },
  input: {
    width: "100%",
    padding: "10px",
    fontSize: "18px",
    textAlign: "center",
    marginBottom: "10px",
    border: "1px solid #888",
    borderRadius: "6px"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
  },
button: {
  height: "60px",
  fontSize: "20px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  backgroundColor: "#e0e0e0",
}
};
