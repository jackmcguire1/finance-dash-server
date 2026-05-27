export const getUnits = (transactions) => {
    if (!transactions?.length) return 0;
    return transactions.reduce((a, b) => {
        const units = parseFloat(b.units);
        return b.buy_sell === "SELL" ? a - units : a + units;
    }, 0);
};

export const getPurchasePrice = (transactions) => {
    if (!transactions?.length) return 0;
    return transactions.reduce((a, b) => {
        const price = parseFloat(b.price);
        return b.buy_sell === "SELL" ? a - price : a + price;
    }, 0);
};

export const getMVTotalGain = (transactions, currentPrice) => {
    if (!transactions?.length) return 0;
    const txGains = transactions.map((t) => currentPrice * parseFloat(t.units) - parseFloat(t.price));
    return txGains.reduce((a, b) => a + b, 0);
};
