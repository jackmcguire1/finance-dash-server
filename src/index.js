import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import ClippedDrawer from './components/ClippedDrawer';
import reportWebVitals from './reportWebVitals';
import { createTheme, ThemeProvider, StyledEngineProvider } from '@mui/material';
import { Account } from "./components/Account";

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#740f87'
        },
        secondary: {
            main: '#2421b7'
        }
    }
});

const root = createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
                <Account>
                    <ClippedDrawer />
                </Account>
            </ThemeProvider>
        </StyledEngineProvider>
    </React.StrictMode>
);

reportWebVitals();
