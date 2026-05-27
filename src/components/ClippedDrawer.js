import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import CssBaseline from "@mui/material/CssBaseline";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import makeStyles from "@mui/styles/makeStyles";
import { useContext } from "react";
import { Navigate, NavLink, Route, BrowserRouter as Router, Routes, useLocation } from "react-router-dom";
import { AccountContext } from "./Account";
import Dashboard from "./Dashboard";
import HoldingsListView from "./HoldingsList/HoldingsListView";
import HoldingView from "./HoldingView";
import Login from "./Login";
import Status from "./Status";
import TickerPricesView from "./TickerPricesView";

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
    },
    appBar: {
        zIndex: theme.zIndex.drawer + 1,
        background: "linear-gradient(0deg, rgba(41,3,48,1) 0%, rgba(116,15,135,1) 100%)",
    },
    drawer: {
        width: drawerWidth,
        flexShrink: 0,
    },
    drawerPaper: {
        width: drawerWidth,
    },
    drawerContainer: {
        overflow: "auto",
    },
    content: {
        flexGrow: 1,
        padding: theme.spacing(3),
    },
    navItemSelected: {
        background: "linear-gradient(0deg, #0a093a 0%, #2421b7 100%)",
    },
    titleText: {
        flex: 1,
    },
}));

function AppShell() {
    const classes = useStyles();
    const { user } = useContext(AccountContext);
    const location = useLocation();

    // Still resolving auth state
    if (user === undefined) {
        return (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    const isLogin = location.pathname === "/login";

    // Redirect unauthenticated users to login (except when already there)
    if (!user && !isLogin) {
        return <Navigate to="/login" replace />;
    }

    // Redirect authenticated users away from login
    if (user && isLogin) {
        return <Navigate to="/dashboard" replace />;
    }

    if (isLogin) {
        return <Login />;
    }

    return (
        <div className={classes.root}>
            <CssBaseline />
            <AppBar position="fixed" className={classes.appBar}>
                <Toolbar>
                    <Typography className={classes.titleText} variant="h6" noWrap>
                        Investment Tracker
                    </Typography>
                    <Status />
                </Toolbar>
            </AppBar>
            <Drawer className={classes.drawer} variant="permanent" classes={{ paper: classes.drawerPaper }}>
                <Toolbar />
                <div className={classes.drawerContainer}>
                    <List disablePadding>
                        {[
                            { to: "/dashboard", icon: <DashboardIcon />, label: "Dashboard" },
                            { to: "/holdings", icon: <AccountBalanceIcon />, label: "Holdings" },
                            { to: "/prices", icon: <ShowChartIcon />, label: "Prices" },
                        ].map(({ to, icon, label }) => (
                            <NavLink key={to} to={to} style={{ textDecoration: "none", color: "inherit" }}>
                                {({ isActive }) => (
                                    <ListItemButton className={isActive ? classes.navItemSelected : undefined}>
                                        <ListItemIcon>{icon}</ListItemIcon>
                                        <ListItemText primary={label} />
                                    </ListItemButton>
                                )}
                            </NavLink>
                        ))}
                    </List>
                </div>
            </Drawer>
            <main className={classes.content}>
                <Toolbar />
                <Routes>
                    <Route path="/holdings/:holdingId" element={<HoldingView />} />
                    <Route path="/holdings" element={<HoldingsListView />} />
                    <Route path="/prices" element={<TickerPricesView />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </main>
        </div>
    );
}

export default function ClippedDrawer() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppShell />
        </Router>
    );
}
