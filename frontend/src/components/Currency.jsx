import { createContext, useContext, useState } from "react";

export const CURRENCIES = [
    { code: "gbp", symbol: "£", label: "GBP", flag: "🇬🇧" },
    { code: "usd", symbol: "$", label: "USD", flag: "🇺🇸" },
    { code: "eur", symbol: "€", label: "EUR", flag: "🇪🇺" },
];

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
    const [currency, setCurrency] = useState(() => localStorage.getItem("currency") ?? "gbp");

    const setAndPersist = (code) => {
        localStorage.setItem("currency", code);
        setCurrency(code);
    };

    const info = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency: setAndPersist, symbol: info.symbol, label: info.label }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    return useContext(CurrencyContext);
}
