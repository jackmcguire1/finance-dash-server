import { Cell, Pie, PieChart, Tooltip } from "recharts";

export default function HoldingsPieChart({ chartData }) {
    const total = chartData.reduce((a, b) => a + b.marketValue, 0);

    return (
        <PieChart width={350} height={350}>
            <Pie
                data={chartData}
                dataKey="marketValue"
                nameKey="symbol"
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={130}
                paddingAngle={2}
            >
                {chartData.map((entry) => (
                    <Cell key={entry.symbol} fill={entry.color} />
                ))}
            </Pie>
            <Tooltip
                formatter={(value, name) => [
                    `£${value.toFixed(2)} (${((100 * value) / total).toFixed(2)}%)`,
                    name,
                ]}
                contentStyle={{ background: "#1a1a2e", border: "1px solid #444", color: "#fff" }}
            />
        </PieChart>
    );
}
