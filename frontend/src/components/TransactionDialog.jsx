import { FilledInput, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import TextField from "@mui/material/TextField";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { auth } from "../firebase";

// tx: existing transaction object when editing, null when creating
export default function TransactionDialog({ open, onClose, holdingId, tx, onSaved, snackbarRef }) {
    const isEdit = Boolean(tx);

    const [buySell, setBuySell] = useState("BUY");
    const [units, setUnits] = useState("");
    const [price, setPrice] = useState("");
    const [pricePerUnit, setPricePerUnit] = useState("");
    const [date, setDate] = useState("");

    useEffect(() => {
        if (open) {
            if (tx) {
                setBuySell(tx.buy_sell);
                setUnits(String(tx.units));
                setPrice(String(tx.price));
                setPricePerUnit(tx.units ? String(parseFloat(tx.price) / parseFloat(tx.units)) : "");
                setDate(tx.datetime ? tx.datetime.slice(0, 10) : "");
            } else {
                setBuySell("BUY");
                setUnits("");
                setPrice("");
                setPricePerUnit("");
                setDate("");
            }
        }
    }, [open, tx]);

    const handleSubmit = () => {
        auth.currentUser.getIdToken().then((token) => {
            const headers = { Authorization: `Bearer ${token}` };
            const data = { datetime: date, buySell, units, price };

            const request = isEdit
                ? axios.put(`${import.meta.env.VITE_API_ENDPOINT}transactions/${tx.tx_id}`, data, { headers })
                : axios.post(`${import.meta.env.VITE_API_ENDPOINT}transactions`, { ...data, holdingId }, { headers });

            request.then((res) => {
                onSaved(res.data, isEdit);
                onClose();
                snackbarRef.current.showSnackbar(
                    "success",
                    isEdit ? "Transaction updated successfully!" : "Transaction added successfully!",
                );
            });
        });
    };

    return (
        <Dialog open={open} onClose={onClose} aria-labelledby="tx-dialog-title">
            <DialogTitle id="tx-dialog-title">{isEdit ? "Edit transaction" : "Add transaction"}</DialogTitle>
            <DialogContent>
                <FormControl variant="filled" sx={{ mb: "20px" }} fullWidth>
                    <InputLabel id="date-label" shrink>
                        Transaction date
                    </InputLabel>
                    <FilledInput
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        labelId="date-label"
                    />
                </FormControl>
                <FormControl variant="filled" sx={{ mb: "20px" }} fullWidth>
                    <RadioGroup
                        row
                        value={buySell}
                        onChange={(e) => setBuySell(e.target.value)}
                    >
                        <FormControlLabel value="BUY" control={<Radio />} label="Buy" />
                        <FormControlLabel value="SELL" control={<Radio />} label="Sell" />
                    </RadioGroup>
                </FormControl>
                <FormControl variant="filled" sx={{ mb: "20px" }} fullWidth>
                    <TextField
                        label="Units"
                        variant="filled"
                        type="number"
                        value={units}
                        onChange={(e) => {
                            setUnits(e.target.value);
                            if (pricePerUnit) setPrice(parseFloat(e.target.value) * parseFloat(pricePerUnit));
                        }}
                    />
                </FormControl>
                <div style={{ display: "flex", gap: "15px" }}>
                    <FormControl variant="filled" sx={{ mb: "20px" }} fullWidth>
                        <TextField
                            label="Total price"
                            variant="filled"
                            type="number"
                            value={price}
                            onChange={(e) => {
                                setPrice(e.target.value);
                                if (units) setPricePerUnit(parseFloat(e.target.value) / parseFloat(units));
                            }}
                        />
                    </FormControl>
                    <div style={{ marginBottom: "20px", display: "flex", alignItems: "center" }}>OR</div>
                    <FormControl variant="filled" sx={{ mb: "20px" }} fullWidth>
                        <TextField
                            label="Price per unit"
                            variant="filled"
                            type="number"
                            value={pricePerUnit}
                            onChange={(e) => {
                                setPricePerUnit(e.target.value);
                                if (units) setPrice(parseFloat(e.target.value) * parseFloat(units));
                            }}
                        />
                    </FormControl>
                </div>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary" variant="outlined">
                    Cancel
                </Button>
                <Button onClick={handleSubmit} color="primary" variant="contained">
                    {isEdit ? "Save" : "Add"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
