import { Divider } from "@mui/material";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import axios from "axios";
import { useContext, useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { toCurrencyString, toGainString } from "../utils";
import { getMVTotalGain, getPurchasePrice, getUnits } from "../utils/holding";
import { AccountContext } from "./Account";
import { useCurrency } from "./Currency";
import ContentLoading from "./ContentLoading";
import { CustomSnackBar } from "./CustomSnackBar";
import HoldingPriceChart from "./HoldingPriceChart/HoldingPriceChart";
import TransactionsTable from "./TransactionsTable";

export default function HoldingView() {
    const { holdingId } = useParams();

    const [name, setName] = useState("");
    const [symbol, setSymbol] = useState("");
    const [currentPrice, setCurrentPrice] = useState(0);
    const [imageUrl, setImageUrl] = useState("");
    const [tickerPrices, setTickerPrices] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [twentyFourHrChange, setTwentyFourHrChange] = useState(0);
    const [twentyFourHrVolume, setTwentyFourHrVolume] = useState(0);
    const [marketCap, setMarketCap] = useState(0);
    const [holdingColor, setHoldingColor] = useState("#75daad");
    const [authFailed, setAuthFailed] = useState(false);

    const [contentLoading, setContentLoading] = useState(true);

    const snackbarRef = useRef();

    const { getSession } = useContext(AccountContext);
    const { currency, symbol: currencySymbol } = useCurrency();

    const [rawTickerPrices, setRawTickerPrices] = useState([]);

    const priceField = currency === "usd" ? "price_usd" : currency === "eur" ? "price_eur" : "price";

    const getTxCircles = () => {
        return transactions.map((t) => {
            return [new Date(t.datetime), parseFloat(t.price) / parseFloat(t.units)];
        });
    };

    useEffect(() => {
        getSession()
            .then((session) => {
                const endpoint = `${import.meta.env.VITE_API_ENDPOINT}holdings/?id=${holdingId}`;
                axios.get(endpoint, { headers: { Authorization: `Bearer ${session.token}` } }).then((res) => {
                    setName(res.data.holding.ticker_name);
                    setSymbol(res.data.holding.ticker_symbol);
                    setImageUrl(res.data.holding.image_url);
                    setRawTickerPrices(res.data.tickerPrices);
                    setTransactions(res.data.transactions);
                    setHoldingColor(res.data.holding.color);
                    setContentLoading(false);
                });
            })
            .catch((_err) => {
                setAuthFailed(true);
            });
    }, [holdingId, getSession]);

    useEffect(() => {
        if (rawTickerPrices.length === 0) return;
        setTickerPrices(rawTickerPrices.map((p) => [new Date(p.datetime), parseFloat(p[priceField] ?? p.price)]));
        const recentTP = rawTickerPrices[rawTickerPrices.length - 1];
        setCurrentPrice(parseFloat(recentTP[priceField] ?? recentTP.price));
        setTwentyFourHrChange(recentTP.twenty_four_hour_change);
        setMarketCap(recentTP.market_cap);
        setTwentyFourHrVolume(recentTP.volume);
    }, [rawTickerPrices, priceField]);

    if (authFailed) {
        return <Navigate to="/login" replace />;
    }

    const labelStyle = { flex: 1, color: "#fefefe63", textAlign: "right", marginRight: "20px" };

    return (
        <>
            {contentLoading ? (
                <ContentLoading />
            ) : (
                <div component={Paper} sx={{ wordWrap: "wr", "& a": { color: "green" } }}>
                    <div style={{ display: "flex", padding: "20px" }}>
                        <div style={{ flex: 2, marginRight: "50px" }}>
                            <div style={{ display: "flex" }}>
                                <div style={{ flex: 1 }}>
                                    <Typography variant="h2">{name}</Typography>
                                    <Typography variant="h3">{symbol}</Typography>
                                </div>
                                <div style={{ marginTop: "40px", flex: 1, display: "flex", flexDirection: "column" }}>
                                    {[
                                        { label: "Price", value: toCurrencyString(currentPrice, currencySymbol) },
                                        { label: "24 hour change (%)", value: toGainString(twentyFourHrChange, currentPrice, currencySymbol) },
                                        { label: "24 hour volume", value: toCurrencyString(twentyFourHrVolume, currencySymbol) },
                                        { label: "Market cap", value: toCurrencyString(marketCap, currencySymbol) },
                                    ].map(({ label, value }) => (
                                        <div key={label} style={{ display: "flex", flex: 1, alignItems: "center" }}>
                                            <div style={labelStyle}><Typography variant="body1">{label}</Typography></div>
                                            <div style={{ flex: 2 }}><Typography variant="body1">{value}</Typography></div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: "flex", alignItems: "center" }}>
                                    <img src={imageUrl} style={{ maxHeight: "100px", maxWidth: "100px", marginLeft: "30px", marginRight: "30px" }} alt="Coin logo" />
                                </div>
                            </div>
                            <Divider sx={{ mt: "20px", mb: "20px", height: "5px" }} />
                            <div style={{ display: "flex" }}>
                                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                                    {[
                                        { label: "Units", value: getUnits(transactions) },
                                        { label: "Market value", value: toCurrencyString(getUnits(transactions) * currentPrice, currencySymbol) },
                                        {
                                            label: "Market value 24h gain",
                                            value: toGainString(parseFloat(twentyFourHrChange), getPurchasePrice(transactions), currencySymbol),
                                        },
                                        {
                                            label: "Market value total gain",
                                            value: toGainString(
                                                (100 * getMVTotalGain(transactions, currentPrice)) / getPurchasePrice(transactions),
                                                getPurchasePrice(transactions),
                                                currencySymbol,
                                            ),
                                        },
                                    ].map(({ label, value }) => (
                                        <div key={label} style={{ display: "flex", flex: 1 }}>
                                            <div style={{ flex: 1, ...labelStyle }}><Typography variant="h6">{label}</Typography></div>
                                            <div style={{ flex: 2 }}><Typography variant="h6">{value}</Typography></div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ flex: 1, display: "flex" }} />
                            </div>
                            <TransactionsTable
                                transactions={transactions}
                                currentPrice={currentPrice}
                                twentyFour={twentyFourHrChange}
                                holdingId={holdingId}
                                snackbarRef={snackbarRef}
                                setTransactions={setTransactions}
                            />
                            <HoldingPriceChart
                                data={tickerPrices}
                                circlesData={getTxCircles()}
                                chartColor={holdingColor}
                                symbol={currencySymbol}
                            />
                            <CustomSnackBar ref={snackbarRef} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
