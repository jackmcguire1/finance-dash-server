import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { toCurrencyString } from '../utils';
import HoldingsPieChart from './HoldingsPieChart';
import ContentLoading from './ContentLoading';
import { AccountContext } from './Account';
import { getMVTotalGain, getPurchasePrice } from '../utils/holding';

function MetricCard({ icon, label, value, sub, subPositive }) {
    const subColor = subPositive === null ? 'text.secondary'
        : subPositive ? 'success.main' : 'error.main';
    return (
        <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{ color: 'primary.main' }}>{icon}</Box>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                </Box>
                <Typography variant="h5" fontWeight={700}>{value}</Typography>
                {sub && (
                    <Typography variant="body2" sx={{ color: subColor, mt: 0.5 }}>{sub}</Typography>
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
        <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5, gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 20, textAlign: 'right' }}>
                {rank}
            </Typography>
            <Box
                sx={{
                    width: 10, height: 10, borderRadius: '50%',
                    bgcolor: holding.color, flexShrink: 0,
                }}
            />
            <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600}>{holding.ticker_symbol}</Typography>
                <Typography variant="caption" color="text.secondary">{holding.ticker_name}</Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" fontWeight={600}>{toCurrencyString(holding.marketValue)}</Typography>
                <Typography variant="caption" sx={{ color: positive ? 'success.main' : 'error.main' }}>
                    {positive ? '+' : ''}{toCurrencyString(Math.abs(gain))} ({positive ? '+' : ''}{gainPct.toFixed(2)}%)
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

    useEffect(() => {
        getSession()
            .then((session) => {
                const endpoint = `${import.meta.env.VITE_API_ENDPOINT}portfolio/?accountId=${session.idToken.payload.sub}`;
                return axios.get(endpoint);
            })
            .then((res) => {
                const combined = res.data.holdings.map((holding) => {
                    const txs = res.data.transactions.filter(t => t.holding_id === holding.holding_id);
                    const units = txs.reduce((a, b) => a + +b.units, 0);
                    const marketValue = units * parseFloat(holding.current_price);
                    const totalGain = getMVTotalGain(txs, parseFloat(holding.current_price));
                    const spent = getPurchasePrice(txs);
                    const totalGainPct = spent > 0 ? (100 * totalGain / spent) : 0;
                    const dailyChange = parseFloat(holding.twenty_four_hour_change) || 0;
                    const dailyGain = marketValue * (dailyChange / 100);
                    return { ...holding, txs, units, marketValue, totalGain, totalGainPct, spent, dailyGain };
                });

                const withValue = combined.filter(h => h.marketValue > 0);
                const totalValue = withValue.reduce((a, b) => a + b.marketValue, 0);
                const totalSpent = withValue.reduce((a, b) => a + b.spent, 0);
                const totalGain = withValue.reduce((a, b) => a + b.totalGain, 0);
                const totalGainPct = totalSpent > 0 ? (100 * totalGain / totalSpent) : 0;
                const dailyGain = withValue.reduce((a, b) => a + b.dailyGain, 0);
                const dailyGainPct = totalValue > 0 ? (100 * dailyGain / totalValue) : 0;

                const sortedByGainPct = [...withValue].sort((a, b) => b.totalGainPct - a.totalGainPct);

                setData({
                    totalValue, totalSpent, totalGain, totalGainPct,
                    dailyGain, dailyGainPct,
                    holdings: withValue,
                    sortedByGainPct,
                    pieData: withValue.map(h => ({
                        marketValue: h.marketValue,
                        symbol: h.ticker_symbol,
                        units: h.units,
                        color: h.color,
                    })),
                });
                setContentLoading(false);
            })
            .catch(() => setAuthFailed(true));
    }, [getSession]);

    if (authFailed) return <Navigate to="/login" replace />;
    if (contentLoading) return <ContentLoading />;

    const { totalValue, totalGain, totalGainPct, dailyGain, dailyGainPct, sortedByGainPct, pieData } = data;

    return (
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
            <Typography variant="h5" fontWeight={700} mb={3}>Dashboard</Typography>

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
                        value={`${totalGain >= 0 ? '+' : ''}${toCurrencyString(Math.abs(totalGain))}`}
                        sub={`${totalGainPct >= 0 ? '+' : ''}${totalGainPct.toFixed(2)}% all time`}
                        subPositive={totalGain >= 0}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        icon={dailyGain >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                        label="24h change"
                        value={`${dailyGain >= 0 ? '+' : ''}${toCurrencyString(Math.abs(dailyGain))}`}
                        sub={`${dailyGainPct >= 0 ? '+' : ''}${dailyGainPct.toFixed(2)}% today`}
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

            {/* Pie chart + top performers */}
            <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                    <Card sx={{ borderRadius: 2, height: '100%' }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} mb={1}>Allocation</Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                <HoldingsPieChart chartData={pieData} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={7}>
                    <Card sx={{ borderRadius: 2, height: '100%' }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} mb={1}>Holdings performance</Typography>
                            {sortedByGainPct.map((h, i) => (
                                <React.Fragment key={h.holding_id}>
                                    {i > 0 && <Divider />}
                                    <TopHoldingRow holding={h} rank={i + 1} />
                                </React.Fragment>
                            ))}
                            {sortedByGainPct.length === 0 && (
                                <Typography variant="body2" color="text.secondary">No holdings with value yet.</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
