import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlined";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toCurrencyString } from "../utils";
import { getMVTotalGain, getPurchasePrice } from "../utils/holding";
import { AccountContext } from "./Account";
import ContentLoading from "./ContentLoading";
import HoldingsPieChart from "./HoldingsPieChart";

function MetricCardSkeleton() {
    return (
        <Card sx={{ height: "100%", borderRadius: 2 }}>
            <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton width={80} height={16} />
                </Box>
                <Skeleton width={120} height={36} />
                <Skeleton width={90} height={16} sx={{ mt: 0.5 }} />
            </CardContent>
        </Card>
    );
}

function EmptyState({ navigate }) {
    return (
        <Box sx={{ maxWidth: 1100, mx: "auto" }}>
            <Typography variant="h5" fontWeight={700} mb={3}>
                Dashboard
            </Typography>

            {/* Skeleton metric cards */}
            <Grid container spacing={2} mb={3}>
                {[0, 1, 2, 3].map((i) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                        <MetricCardSkeleton />
                    </Grid>
                ))}
            </Grid>

            {/* Empty state prompt */}
            <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 6, gap: 2 }}>
                        <AccountBalanceWalletIcon sx={{ fontSize: 56, color: "text.disabled" }} />
                        <Typography variant="h6" fontWeight={600}>
                            Nothing to see here yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={360}>
                            Add your holdings to start tracking your portfolio value, gains, and allocation.
                        </Typography>
                        <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap", justifyContent: "center" }}>
                            <Button
                                variant="contained"
                                startIcon={<UploadFileIcon />}
                                onClick={() => navigate("/holdings")}
                                sx={{
                                    background: "linear-gradient(90deg, #740f87, #2421b7)",
                                    "&:hover": { background: "linear-gradient(90deg, #8a1aa0, #3530d4)" },
                                }}
                            >
                                Import portfolio
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<AddCircleOutlineIcon />}
                                onClick={() => navigate("/holdings")}
                            >
                                Add holding
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}

function MetricCard({ icon, label, value, sub, subPositive }) {
    const subColor = subPositive === null ? "text.secondary" : subPositive ? "success.main" : "error.main";
    return (
        <Card sx={{ height: "100%", borderRadius: 2 }}>
            <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Box sx={{ color: "primary.main" }}>{icon}</Box>
                    <Typography variant="body2" color="text.secondary">
                        {label}
                    </Typography>
                </Box>
                <Typography variant="h5" fontWeight={700}>
                    {value}
                </Typography>
                {sub && (
                    <Typography variant="body2" sx={{ color: subColor, mt: 0.5 }}>
                        {sub}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}

function TopHoldingRow({ holding, rank }) {
    const gain = holding.totalGain;
    const gainPct = holding.totalGainPct;
    const positive = gain >= 0;
    return (
        <Box sx={{ display: "flex", alignItems: "center", py: 1.5, gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 20, textAlign: "right" }}>
                {rank}
            </Typography>
            <Box
                sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: holding.color,
                    flexShrink: 0,
                }}
            />
            <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                    {holding.ticker_symbol}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {holding.ticker_name}
                </Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
                <Typography variant="body2" fontWeight={600}>
                    {toCurrencyString(holding.marketValue)}
                </Typography>
                <Typography variant="caption" sx={{ color: positive ? "success.main" : "error.main" }}>
                    {positive ? "+" : ""}
                    {toCurrencyString(Math.abs(gain))} ({positive ? "+" : ""}
                    {gainPct.toFixed(2)}%)
                </Typography>
            </Box>
        </Box>
    );
}

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [contentLoading, setContentLoading] = useState(true);
    const [authFailed, setAuthFailed] = useState(false);
    const { getSession } = useContext(AccountContext);
    const navigate = useNavigate();

    useEffect(() => {
        getSession()
            .then((session) => {
                const endpoint = `${import.meta.env.VITE_API_ENDPOINT}portfolio/`;
                return axios.get(endpoint, { headers: { Authorization: `Bearer ${session.token}` } });
            })
            .then((res) => {
                const combined = res.data.holdings.map((holding) => {
                    const txs = res.data.transactions.filter((t) => t.holding_id === holding.holding_id);
                    const units = txs.reduce((a, b) => a + +b.units, 0);
                    const marketValue = units * parseFloat(holding.current_price);
                    const totalGain = getMVTotalGain(txs, parseFloat(holding.current_price));
                    const spent = getPurchasePrice(txs);
                    const totalGainPct = spent > 0 ? (100 * totalGain) / spent : 0;
                    const dailyChange = parseFloat(holding.twenty_four_hour_change) || 0;
                    const dailyGain = marketValue * (dailyChange / 100);
                    return { ...holding, txs, units, marketValue, totalGain, totalGainPct, spent, dailyGain };
                });

                const withValue = combined.filter((h) => h.marketValue > 0);
                const totalValue = withValue.reduce((a, b) => a + b.marketValue, 0);
                const totalSpent = withValue.reduce((a, b) => a + b.spent, 0);
                const totalGain = withValue.reduce((a, b) => a + b.totalGain, 0);
                const totalGainPct = totalSpent > 0 ? (100 * totalGain) / totalSpent : 0;
                const dailyGain = withValue.reduce((a, b) => a + b.dailyGain, 0);
                const dailyGainPct = totalValue > 0 ? (100 * dailyGain) / totalValue : 0;

                const sortedByGainPct = [...withValue].sort((a, b) => b.totalGainPct - a.totalGainPct);

                setData({
                    totalValue,
                    totalSpent,
                    totalGain,
                    totalGainPct,
                    dailyGain,
                    dailyGainPct,
                    lastPriceUpdate: res.data.lastPriceUpdate,
                    holdings: withValue,
                    sortedByGainPct,
                    pieData: withValue.map((h) => ({
                        marketValue: h.marketValue,
                        symbol: h.ticker_symbol,
                        units: h.units,
                        color: h.color,
                    })),
                });
                setContentLoading(false);
            })
            .catch((err) => {
                if (err?.message === "No authenticated user") setAuthFailed(true);
                // network/server errors don't redirect — just leave the loading state
            });
    }, [getSession]);

    if (authFailed) return <Navigate to="/login" replace />;
    if (contentLoading) return <ContentLoading />;
    if (!data || data.holdings.length === 0) return <EmptyState navigate={navigate} lastPriceUpdate={data?.lastPriceUpdate} />;

    const { totalValue, totalGain, totalGainPct, dailyGain, dailyGainPct, lastPriceUpdate, holdings: withValue, sortedByGainPct, pieData } = data;

    return (
        <Box sx={{ maxWidth: 1100, mx: "auto" }}>
            <Typography variant="h5" fontWeight={700} mb={3}>
                Dashboard
            </Typography>

            {/* Summary metric cards */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        icon={<AccountBalanceWalletIcon />}
                        label="Total value"
                        value={toCurrencyString(totalValue)}
                        sub={null}
                        subPositive={null}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        icon={<ShowChartIcon />}
                        label="Total gain / loss"
                        value={`${totalGain >= 0 ? "+" : ""}${toCurrencyString(Math.abs(totalGain))}`}
                        sub={`${totalGainPct >= 0 ? "+" : ""}${totalGainPct.toFixed(2)}% all time`}
                        subPositive={totalGain >= 0}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        icon={dailyGain >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                        label="24h change"
                        value={`${dailyGain >= 0 ? "+" : ""}${toCurrencyString(Math.abs(dailyGain))}`}
                        sub={`${dailyGainPct >= 0 ? "+" : ""}${dailyGainPct.toFixed(2)}% today`}
                        subPositive={dailyGain >= 0}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        icon={<AccountBalanceWalletIcon />}
                        label="Holdings"
                        value={pieData.length}
                        sub={`${toCurrencyString(data.totalSpent)} invested`}
                        subPositive={null}
                    />
                </Grid>
            </Grid>

            {/* Price snapshot */}
            <Card sx={{ borderRadius: 2, mb: 3 }}>
                <CardContent sx={{ pb: "12px !important" }}>
                    <Typography variant="subtitle1" fontWeight={600} mb={1}>
                        Price snapshot
                    </Typography>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Coin</TableCell>
                                <TableCell align="right">Price</TableCell>
                                <TableCell align="right">24h change</TableCell>
                                <TableCell align="right">Market cap</TableCell>
                                <TableCell align="right">Last updated</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {[...withValue]
                                .sort((a, b) => b.marketValue - a.marketValue)
                                .map((h) => {
                                    const change = parseFloat(h.twenty_four_hour_change) || 0;
                                    return (
                                        <TableRow key={h.holding_id}>
                                            <TableCell>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                    {h.image_url && (
                                                        <Box component="img" src={h.image_url} sx={{ width: 18, height: 18 }} />
                                                    )}
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
                                                            {h.ticker_symbol}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {h.ticker_name}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right">
                                                {toCurrencyString(parseFloat(h.current_price))}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" sx={{ color: change >= 0 ? "success.main" : "error.main" }}>
                                                    {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                {toCurrencyString(parseFloat(h.market_cap))}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="caption" color="text.secondary">
                                                    {h.price_last_updated
                                                        ? new Date(h.price_last_updated).toLocaleString()
                                                        : "—"}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pie chart + top performers */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 5 }}>
                    <Card sx={{ borderRadius: 2, height: "100%" }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} mb={1}>
                                Allocation
                            </Typography>
                            <Box sx={{ display: "flex", justifyContent: "center" }}>
                                <HoldingsPieChart chartData={pieData} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                    <Card sx={{ borderRadius: 2, height: "100%" }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} mb={1}>
                                Holdings performance
                            </Typography>
                            {sortedByGainPct.map((h, i) => (
                                <React.Fragment key={h.holding_id}>
                                    {i > 0 && <Divider />}
                                    <TopHoldingRow holding={h} rank={i + 1} />
                                </React.Fragment>
                            ))}
                            {sortedByGainPct.length === 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    No holdings with value yet.
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
