import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FilledInput from "@mui/material/FilledInput";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import axios from "axios";
import React, { forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toCurrencyString } from "../../utils";
import { AccountContext } from "../Account";

function CoinPickerTable({ coins, loading, selected, onSelect }) {
    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
                <CircularProgress />
            </Box>
        );
    }
    if (coins.length === 0) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
                <Typography variant="body2" color="text.secondary">No results</Typography>
            </Box>
        );
    }
    return (
        <TableContainer sx={{ height: 300, overflow: "auto" }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>Coin</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">24h</TableCell>
                        <TableCell align="right">Market cap</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {coins.map((coin) => {
                        const change = coin.price_change_percentage_24h ?? 0;
                        const isSelected = selected?.id === coin.id;
                        return (
                            <TableRow
                                key={coin.id}
                                hover
                                selected={isSelected}
                                onClick={() => onSelect(coin)}
                                sx={{ cursor: "pointer" }}
                            >
                                <TableCell>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        {coin.image && (
                                            <Box component="img" src={coin.image} sx={{ width: 24, height: 24 }} />
                                        )}
                                        <Box>
                                            <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
                                                {coin.symbol.toUpperCase()}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {coin.name}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell align="right">
                                    {coin.current_price != null ? toCurrencyString(coin.current_price) : "—"}
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" sx={{ color: change >= 0 ? "success.main" : "error.main" }}>
                                        {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    {coin.market_cap != null ? toCurrencyString(coin.market_cap) : "—"}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

const CreateHoldingDialog = forwardRef(function CreateHoldingDialog(props, ref) {
    const navigate = useNavigate();

    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);

    const [topCoins, setTopCoins] = useState([]);
    const [searchCoins, setSearchCoins] = useState(null);
    const [searchText, setSearchText] = useState("");
    const [coinsLoading, setCoinsLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const searchTimeout = useRef(null);

    const [selected, setSelected] = useState(null);
    const [addLoading, setAddLoading] = useState(false);

    const [buySell, setBuySell] = useState("BUY");
    const [units, setUnits] = useState("");
    const [price, setPrice] = useState("");
    const [pricePerUnit, setPricePerUnit] = useState("");
    const [date, setDate] = useState("");

    const { getSession } = useContext(AccountContext);

    // Expose openWithCoin(coin) so TickerPricesView can skip step 1
    useImperativeHandle(ref, () => ({
        openWithCoin(coin) {
            resetTransactionFields();
            setSelected(coin);
            setStep(2);
            setOpen(true);
        },
    }));

    useEffect(() => {
        if (open && step === 1 && topCoins.length === 0) {
            setCoinsLoading(true);
            axios
                .get(`${import.meta.env.VITE_API_ENDPOINT}coins/markets?perPage=25`)
                .then((res) => { setTopCoins(res.data); setCoinsLoading(false); })
                .catch(() => setCoinsLoading(false));
        }
    }, [open, step]);

    const resetTransactionFields = () => {
        setBuySell("BUY");
        setUnits("");
        setPrice("");
        setPricePerUnit("");
        setDate("");
    };

    const handleSearchChange = (value) => {
        setSearchText(value);
        clearTimeout(searchTimeout.current);
        if (!value.trim()) {
            setSearchCoins(null);
            setSearchLoading(false);
            return;
        }
        setSearchLoading(true);
        searchTimeout.current = setTimeout(() => {
            axios
                .get(`${import.meta.env.VITE_API_ENDPOINT}coins/search?q=${encodeURIComponent(value)}`)
                .then((res) => { setSearchCoins(res.data); setSearchLoading(false); })
                .catch(() => setSearchLoading(false));
        }, 400);
    };

    const handleClickOpen = () => {
        setStep(1);
        setSelected(null);
        setSearchText("");
        setSearchCoins(null);
        resetTransactionFields();
        setOpen(true);
    };

    const handleClose = () => setOpen(false);

    const handleAdd = (skipTransaction) => {
        getSession()
            .then((session) => {
                setAddLoading(true);
                const headers = { Authorization: `Bearer ${session.token}` };

                axios
                    .post(
                        `${import.meta.env.VITE_API_ENDPOINT}holdings`,
                        { coinId: selected.id },
                        { timeout: 30000, headers },
                    )
                    .then((res) => {
                        const newHolding = res.data;
                        const afterTx = (tx) => {
                            props.setHoldings?.([...props.holdings, { ...newHolding, transactions: tx ? [tx] : [] }]);
                            setAddLoading(false);
                            setOpen(false);
                            props.snackbarRef?.current.showSnackbar("success", "Holding added");
                        };

                        if (skipTransaction || !units || !price || !date) {
                            afterTx(null);
                            return;
                        }

                        axios
                            .post(
                                `${import.meta.env.VITE_API_ENDPOINT}transactions`,
                                { holdingId: newHolding.holding_id, datetime: date, buySell, units, price },
                                { headers },
                            )
                            .then((txRes) => afterTx(txRes.data))
                            .catch(() => afterTx(null));
                    })
                    .catch(() => setAddLoading(false));
            })
            .catch(() => navigate("/login"));
    };

    const displayedCoins = searchCoins ?? topCoins;
    const isLoading = searchText ? searchLoading : coinsLoading;

    return (
        <div>
            {/* Only render the icon button when used standalone (not triggered externally) */}
            {props.showTrigger !== false && (
                <Tooltip title="Add holding" onClick={handleClickOpen}>
                    <IconButton aria-label="add" size="large">
                        <AddIcon />
                    </IconButton>
                </Tooltip>
            )}
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
                {step === 1 && (
                    <>
                        <DialogTitle>Add holding — select coin</DialogTitle>
                        <DialogContent sx={{ pb: 1 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search by name or symbol…"
                                value={searchText}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                autoComplete="off"
                                sx={{ mb: 2 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchLoading ? (
                                        <InputAdornment position="end">
                                            <CircularProgress size={16} />
                                        </InputAdornment>
                                    ) : null,
                                }}
                            />
                            {!searchText && (
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                                    Top 25 by market cap
                                </Typography>
                            )}
                            <CoinPickerTable
                                coins={displayedCoins}
                                loading={isLoading}
                                selected={selected}
                                onSelect={setSelected}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleClose} variant="outlined">Cancel</Button>
                            <Button onClick={() => setStep(2)} variant="contained" disabled={!selected}>
                                Next — {selected ? `${selected.symbol.toUpperCase()} / ${selected.name}` : "select a coin"}
                            </Button>
                        </DialogActions>
                    </>
                )}
                {step === 2 && (
                    <>
                        <DialogTitle>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                {selected?.image && (
                                    <Box component="img" src={selected.image} sx={{ width: 28, height: 28 }} />
                                )}
                                Add holding — {selected?.name}
                            </Box>
                        </DialogTitle>
                        <DialogContent>
                            <FormControl variant="filled" sx={{ mb: 2 }} fullWidth>
                                <InputLabel shrink>Transaction date</InputLabel>
                                <FilledInput
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </FormControl>
                            <FormControl variant="filled" sx={{ mb: 2 }} fullWidth>
                                <RadioGroup row value={buySell} onChange={(e) => setBuySell(e.target.value)}>
                                    <FormControlLabel value="BUY" control={<Radio />} label="Buy" />
                                    <FormControlLabel value="SELL" control={<Radio />} label="Sell" />
                                </RadioGroup>
                            </FormControl>
                            <FormControl variant="filled" sx={{ mb: 2 }} fullWidth>
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
                            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                                <FormControl variant="filled" sx={{ mb: 2 }} fullWidth>
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
                                <Typography color="text.secondary" sx={{ mb: 2 }}>OR</Typography>
                                <FormControl variant="filled" sx={{ mb: 2 }} fullWidth>
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
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setStep(1)} variant="outlined">Back</Button>
                            <Button onClick={() => handleAdd(true)} variant="outlined" disabled={addLoading}>Skip</Button>
                            <Button
                                onClick={() => handleAdd(false)}
                                variant="contained"
                                disabled={addLoading || !units || !price || !date}
                            >
                                {addLoading ? <CircularProgress size={24} /> : "Add"}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </div>
    );
});

export default CreateHoldingDialog;
