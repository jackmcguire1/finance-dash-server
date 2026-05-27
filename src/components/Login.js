import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AccountContext } from "./Account";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { authenticate } = useContext(AccountContext);
    const navigate = useNavigate();

    const onSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);
        try {
            await authenticate(email, password);
            navigate("/dashboard");
        } catch (err) {
            setError("Invalid email or password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #0a093a 0%, #29033f 50%, #1a0a2e 100%)",
            }}
        >
            <Card sx={{ width: 380, borderRadius: 3, boxShadow: 10 }}>
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #740f87, #2421b7)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                mb: 2,
                            }}
                        >
                            <AccountBalanceIcon sx={{ color: "white", fontSize: 28 }} />
                        </Box>
                        <Typography variant="h5" fontWeight={700}>
                            Investment Tracker
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mt={0.5}>
                            Sign in to your account
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={onSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <TextField
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            fullWidth
                            required
                            autoComplete="email"
                            autoFocus
                        />
                        <TextField
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            fullWidth
                            required
                            autoComplete="current-password"
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            size="large"
                            disabled={loading}
                            sx={{
                                mt: 1,
                                py: 1.5,
                                background: "linear-gradient(90deg, #740f87, #2421b7)",
                                "&:hover": {
                                    background: "linear-gradient(90deg, #8a1aa0, #3530d4)",
                                },
                            }}
                        >
                            {loading ? <CircularProgress size={22} color="inherit" /> : "Sign in"}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
