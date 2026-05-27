import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import CssBaseline from "@mui/material/CssBaseline";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useContext } from "react";
import { Navigate, NavLink, Route, BrowserRouter as Router, Routes, useLocation } from "react-router-dom";
import { AccountContext } from "./Account";
import { CURRENCIES, useCurrency } from "./Currency";
import Dashboard from "./Dashboard";
import HoldingsListView from "./HoldingsList/HoldingsListView";
import HoldingView from "./HoldingView";
import Login from "./Login";
import Status from "./Status";
import TickerPricesView from "./TickerPricesView";

const drawerWidth = 220;

const NAV_ITEMS = [
    { to: "/dashboard", icon: <DashboardIcon fontSize="small" />, label: "Dashboard" },
    { to: "/holdings", icon: <AccountBalanceIcon fontSize="small" />, label: "Holdings" },
    { to: "/prices", icon: <ShowChartIcon fontSize="small" />, label: "Prices" },
];

function AppShell() {
    const { user } = useContext(AccountContext);
    const { currency, setCurrency } = useCurrency();
    const location = useLocation();

    if (user === undefined) {
        return (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    const isLogin = location.pathname === "/login";
    if (!user && !isLogin) return <Navigate to="/login" replace />;
    if (user && isLogin) return <Navigate to="/dashboard" replace />;
    if (isLogin) return <Login />;

    return (
        <Box sx={{ display: "flex" }}>
            <CssBaseline />

            {/* Sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    "& .MuiDrawer-paper": {
                        width: drawerWidth,
                        background: "linear-gradient(180deg, #0d0d1a 0%, #1a0820 100%)",
                        borderRight: "1px solid rgba(255,255,255,0.06)",
                        display: "flex",
                        flexDirection: "column",
                    },
                }}
            >
                {/* Logo area */}
                <Box sx={{ px: 2.5, py: 2.5, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{
                            width: 32, height: 32, borderRadius: 1.5,
                            background: "linear-gradient(135deg, #740f87, #2421b7)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                        }}>
                            <ShowChartIcon sx={{ fontSize: 18, color: "white" }} />
                        </Box>
                        <Box>
                            <Typography variant="body2" fontWeight={700} color="white" lineHeight={1.2}>
                                Investment
                            </Typography>
                            <Typography variant="caption" color="rgba(255,255,255,0.45)" lineHeight={1.2}>
                                Tracker
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Nav */}
                <Box sx={{ flex: 1, py: 1.5, px: 1.5 }}>
                    <Typography variant="caption" color="rgba(255,255,255,0.3)" sx={{ px: 1, mb: 0.5, display: "block", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10 }}>
                        Menu
                    </Typography>
                    <List disablePadding>
                        {NAV_ITEMS.map(({ to, icon, label }) => (
                            <NavLink key={to} to={to} style={{ textDecoration: "none" }}>
                                {({ isActive }) => (
                                    <ListItemButton
                                        sx={{
                                            borderRadius: 1.5,
                                            mb: 0.5,
                                            px: 1.5,
                                            py: 1,
                                            color: isActive ? "white" : "rgba(255,255,255,0.5)",
                                            background: isActive ? "rgba(116,15,135,0.25)" : "transparent",
                                            "&:hover": {
                                                background: isActive ? "rgba(116,15,135,0.35)" : "rgba(255,255,255,0.05)",
                                                color: "white",
                                            },
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>{icon}</ListItemIcon>
                                        <ListItemText
                                            primary={label}
                                            primaryTypographyProps={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}
                                        />
                                        {isActive && (
                                            <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: "#b44fc4", ml: 1 }} />
                                        )}
                                    </ListItemButton>
                                )}
                            </NavLink>
                        ))}
                    </List>
                </Box>

                {/* Currency picker at the bottom of the sidebar */}
                <Box sx={{ px: 1.5, py: 2, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <Typography variant="caption" color="rgba(255,255,255,0.3)" sx={{ px: 1, mb: 0.75, display: "block", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10 }}>
                        Currency
                    </Typography>
                    <Select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        size="small"
                        variant="outlined"
                        fullWidth
                        sx={{
                            color: "white",
                            fontSize: 14,
                            ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.12)" },
                            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.3)" },
                            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.4)" },
                            ".MuiSvgIcon-root": { color: "rgba(255,255,255,0.5)" },
                            background: "rgba(255,255,255,0.04)",
                            borderRadius: 1.5,
                        }}
                        renderValue={(val) => {
                            const c = CURRENCIES.find((c) => c.code === val);
                            return (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <span style={{ fontSize: 16 }}>{c.flag}</span>
                                    <Typography variant="body2" fontWeight={600} color="white">{c.label}</Typography>
                                    <Typography variant="caption" color="rgba(255,255,255,0.4)" sx={{ ml: 0.5 }}>{c.symbol}</Typography>
                                </Box>
                            );
                        }}
                        MenuProps={{ PaperProps: { sx: { mt: 0.5 } } }}
                    >
                        {CURRENCIES.map((c) => (
                            <MenuItem key={c.code} value={c.code}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                    <span style={{ fontSize: 20 }}>{c.flag}</span>
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>{c.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{c.symbol}</Typography>
                                    </Box>
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </Box>
            </Drawer>

            {/* Main content — no top AppBar, just a thin header strip */}
            <Box component="main" sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
                <Box sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    px: 3,
                    py: 1.5,
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    backdropFilter: "blur(8px)",
                    background: "rgba(13,13,26,0.7)",
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                }}>
                    <Status />
                </Box>
                <Box sx={{ flexGrow: 1, p: 3 }}>
                    <Routes>
                        <Route path="/holdings/:holdingId" element={<HoldingView />} />
                        <Route path="/holdings" element={<HoldingsListView />} />
                        <Route path="/prices" element={<TickerPricesView />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </Box>
            </Box>
        </Box>
    );
}

export default function ClippedDrawer() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppShell />
        </Router>
    );
}
