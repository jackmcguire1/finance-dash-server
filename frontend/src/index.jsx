import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createTheme, StyledEngineProvider, ThemeProvider } from "@mui/material";
import { Account } from "./components/Account";
import { CurrencyProvider } from "./components/Currency";
import ClippedDrawer from "./components/ClippedDrawer";
import reportWebVitals from "./reportWebVitals";

const theme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#740f87",
        },
        secondary: {
            main: "#2421b7",
        },
    },
});

const root = createRoot(document.getElementById("root"));
root.render(
    <React.StrictMode>
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
                <Account>
                    <CurrencyProvider>
                        <ClippedDrawer />
                    </CurrencyProvider>
                </Account>
            </ThemeProvider>
        </StyledEngineProvider>
    </React.StrictMode>,
);

reportWebVitals();
