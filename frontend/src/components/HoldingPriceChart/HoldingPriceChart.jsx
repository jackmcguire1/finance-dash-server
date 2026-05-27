import {
    Area,
    AreaChart,
    Brush,
    CartesianGrid,
    ReferenceDot,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const formatDate = (ts) => {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString();
};

const makeFormatPrice = (symbol) => (v) =>
    `${symbol}${Number(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function HoldingPriceChart({ data, circlesData, chartColor = "#75daad", symbol = "£" }) {
    const formatPrice = makeFormatPrice(symbol);
    if (!data || data.length === 0) return null;

    const chartPoints = data.map(([date, price]) => ({
        ts: new Date(date).getTime(),
        price: parseFloat(price),
    }));

    const gradId = `grad-${chartColor.replace("#", "")}`;

    return (
        <ResponsiveContainer width="100%" height={500}>
            <AreaChart data={chartPoints} margin={{ top: 20, right: 20, bottom: 20, left: 60 }}>
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.6} />
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0.1} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                    dataKey="ts"
                    type="number"
                    scale="time"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={formatDate}
                    stroke="#fff"
                    tick={{ fill: "#fff", fontSize: 12 }}
                    tickCount={7}
                />
                <YAxis
                    tickFormatter={formatPrice}
                    stroke="#fff"
                    tick={{ fill: "#fff", fontSize: 12 }}
                    width={80}
                />
                <Tooltip
                    labelFormatter={(ts) => new Date(ts).toLocaleDateString()}
                    formatter={(v) => [formatPrice(v), "Price"]}
                    contentStyle={{ background: "#1a1a2e", border: "1px solid #444", color: "#fff" }}
                />
                <Area
                    type="monotone"
                    dataKey="price"
                    stroke={chartColor}
                    strokeWidth={2}
                    fill={`url(#${gradId})`}
                    dot={false}
                    activeDot={{ r: 4, fill: chartColor }}
                    isAnimationActive={false}
                />
                {(circlesData || []).map(([date, price], i) => (
                    <ReferenceDot
                        key={i}
                        x={new Date(date).getTime()}
                        y={parseFloat(price)}
                        r={7}
                        fill="green"
                        stroke="none"
                    />
                ))}
                <Brush dataKey="ts" height={30} stroke="#555" tickFormatter={formatDate} />
            </AreaChart>
        </ResponsiveContainer>
    );
}
