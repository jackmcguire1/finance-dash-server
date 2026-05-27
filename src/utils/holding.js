export const getUnits = (transactions) => {
    if (!transactions?.length) return 0;
    return transactions.reduce((a, b) => a + parseFloat(b.units), 0);
}

export const getPurchasePrice = (transactions) => {
    if (!transactions?.length) return 0;
    return transactions.reduce((a, b) => a + parseFloat(b.price), 0);
}

export const getMVTotalGain = (transactions, currentPrice) => {
    if (!transactions?.length) return 0;
    const txGains = transactions.map((t) => (currentPrice * parseFloat(t.units)) - parseFloat(t.price));
    return txGains.reduce((a, b) => a + b, 0);
}
