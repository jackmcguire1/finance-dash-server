import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
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
    const [order, setOrder] = useState("desc");
    const [orderBy, setOrderBy] = useState("market_cap");
    const searchTimeout = useRef(null);
    const { getSession } = useContext(AccountContext);

    useEffect(() => {
        getSession()
            .then(() =>
                axios.get(`${import.meta.env.VITE_API_ENDPOINT}coins/markets?perPage=100`),
            )
            .then((res) => {
                setTopCoins(res.data);
                setInitialLoading(false);
            })
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

    const handleSort = (id) => {
        const isAsc = orderBy === id && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(id);
    };

    const displayedCoins = searchCoins ?? topCoins;

    const sorted = useMemo(
        () => [...displayedCoins].sort(getComparator(order, orderBy)),
        [displayedCoins, order, orderBy],
    );

    if (authFailed) return <Navigate to="/login" replace />;
    if (initialLoading) return <ContentLoading />;

    return (
        <Box sx={{ maxWidth: 1100, mx: "auto" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Prices</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {searchText ? `Search results for "${searchText}"` : "Top 100 by market cap"}
                    </Typography>
                </Box>
                <TextField
                    size="small"
                    placeholder="Search by name or symbol…"
                    value={searchText}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    autoComplete="off"
                    sx={{ width: 260 }}
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
                        {sorted.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No results for "{searchText}"
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            sorted.map((coin) => {
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
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
