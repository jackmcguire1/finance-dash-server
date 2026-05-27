import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import axios from "axios";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { AccountContext } from "./Account";
import ContentLoading from "./ContentLoading";
import CreateHoldingDialog from "./HoldingsList/CreateHoldingDialog";
import { toCurrencyString } from "../utils";

function descendingComparator(a, b, orderBy) {
    if (b[orderBy] < a[orderBy]) return -1;
    if (b[orderBy] > a[orderBy]) return 1;
    return 0;
}

function getComparator(order, orderBy) {
    return order === "desc"
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

const headCells = [
    { id: "name", label: "Coin", numeric: false },
    { id: "current_price", label: "Price", numeric: true },
    { id: "price_change_percentage_24h", label: "24h Change", numeric: true },
    { id: "market_cap", label: "Market Cap", numeric: true },
    { id: "total_volume", label: "Volume (24h)", numeric: true },
];

export default function TickerPricesView() {
    const [topCoins, setTopCoins] = useState([]);
    const [searchCoins, setSearchCoins] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [authFailed, setAuthFailed] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [popperOpen, setPopperOpen] = useState(false);
    const [order, setOrder] = useState("desc");
    const [orderBy, setOrderBy] = useState("market_cap");
    const searchTimeout = useRef(null);
    const searchAnchorRef = useRef(null);
    const dialogRef = useRef(null);
    const { getSession } = useContext(AccountContext);

    useEffect(() => {
        getSession()
            .then(() => axios.get(`${import.meta.env.VITE_API_ENDPOINT}coins/markets?perPage=100`))
            .then((res) => { setTopCoins(res.data); setInitialLoading(false); })
            .catch((err) => {
                if (err?.message === "No authenticated user") setAuthFailed(true);
                else setInitialLoading(false);
            });
    }, [getSession]);

    const handleSearchChange = (value) => {
        setSearchText(value);
        clearTimeout(searchTimeout.current);
        if (!value.trim()) {
            setSearchCoins(null);
            setSearchLoading(false);
            setPopperOpen(false);
            return;
        }
        setSearchLoading(true);
        setPopperOpen(true);
        searchTimeout.current = setTimeout(() => {
            axios
                .get(`${import.meta.env.VITE_API_ENDPOINT}coins/search?q=${encodeURIComponent(value)}`)
                .then((res) => { setSearchCoins(res.data); setSearchLoading(false); })
                .catch(() => setSearchLoading(false));
        }, 400);
    };

    const handleSelectFromPopper = (coin) => {
        setSearchText("");
        setSearchCoins(null);
        setPopperOpen(false);
        dialogRef.current.openWithCoin(coin);
    };

    const handleSort = (id) => {
        const isAsc = orderBy === id && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(id);
    };

    const sorted = useMemo(
        () => [...topCoins].sort(getComparator(order, orderBy)),
        [topCoins, order, orderBy],
    );

    if (authFailed) return <Navigate to="/login" replace />;
    if (initialLoading) return <ContentLoading />;

    return (
        <Box sx={{ maxWidth: 1100, mx: "auto" }}>
            <CreateHoldingDialog ref={dialogRef} showTrigger={false} holdings={[]} setHoldings={() => {}} />

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>Prices</Typography>
                <ClickAwayListener onClickAway={() => setPopperOpen(false)}>
                    <Box sx={{ position: "relative", width: 300 }} ref={searchAnchorRef}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search to add a coin…"
                            value={searchText}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            onFocus={() => searchText && setPopperOpen(true)}
                            autoComplete="off"
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
                        <Popper
                            open={popperOpen}
                            anchorEl={searchAnchorRef.current}
                            placement="bottom-end"
                            sx={{ zIndex: 1300, width: searchAnchorRef.current?.offsetWidth ?? 300 }}
                        >
                            <Paper elevation={4} sx={{ maxHeight: 320, overflow: "auto", borderRadius: 2, mt: 0.5 }}>
                                {searchLoading ? (
                                    <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                                        <CircularProgress size={24} />
                                    </Box>
                                ) : searchCoins?.length === 0 ? (
                                    <Box sx={{ p: 2 }}>
                                        <Typography variant="body2" color="text.secondary">No results</Typography>
                                    </Box>
                                ) : (
                                    <Table size="small">
                                        <TableBody>
                                            {(searchCoins ?? []).map((coin) => {
                                                const change = coin.price_change_percentage_24h ?? 0;
                                                return (
                                                    <TableRow
                                                        key={coin.id}
                                                        hover
                                                        onClick={() => handleSelectFromPopper(coin)}
                                                        sx={{ cursor: "pointer" }}
                                                    >
                                                        <TableCell>
                                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                                                {coin.image && (
                                                                    <Box component="img" src={coin.image} sx={{ width: 22, height: 22 }} />
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
                                                        <TableCell align="right" sx={{ pr: 1 }}>
                                                            <Button size="small" variant="outlined" startIcon={<AddIcon />}>
                                                                Add
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </Paper>
                        </Popper>
                    </Box>
                </ClickAwayListener>
            </Box>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table size="medium">
                    <TableHead>
                        <TableRow>
                            {headCells.map((cell) => (
                                <TableCell
                                    key={cell.id}
                                    align={cell.numeric ? "right" : "left"}
                                    sortDirection={orderBy === cell.id ? order : false}
                                >
                                    <TableSortLabel
                                        active={orderBy === cell.id}
                                        direction={orderBy === cell.id ? order : "asc"}
                                        onClick={() => handleSort(cell.id)}
                                    >
                                        {cell.label}
                                    </TableSortLabel>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sorted.map((coin) => {
                            const change = coin.price_change_percentage_24h ?? 0;
                            return (
                                <TableRow key={coin.id} hover>
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
                                    <TableCell align="right">
                                        {coin.total_volume != null ? toCurrencyString(coin.total_volume) : "—"}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
