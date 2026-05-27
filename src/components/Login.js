import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AccountContext } from "./Account";

const FIREBASE_ERRORS = {
    "auth/invalid-email": "Invalid email address.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
};

function parseError(err) {
    return FIREBASE_ERRORS[err?.code] ?? "Something went wrong. Please try again.";
}

function Header({ mode }) {
    const subtitles = {
        signin: "Sign in to your account",
        signup: "Create a new account",
        reset: "Reset your password",
    };
    return (
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
                {subtitles[mode]}
            </Typography>
        </Box>
    );
}

function SignInForm({ onSwitch }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { authenticate } = useContext(AccountContext);
    const navigate = useNavigate();

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await authenticate(email, password);
            navigate("/dashboard");
        } catch (err) {
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={onSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
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
            <Box sx={{ textAlign: "right", mt: -1 }}>
                <Link component="button" type="button" variant="body2" onClick={() => onSwitch("reset")}>
                    Forgot password?
                </Link>
            </Box>
            <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{
                    py: 1.5,
                    background: "linear-gradient(90deg, #740f87, #2421b7)",
                    "&:hover": { background: "linear-gradient(90deg, #8a1aa0, #3530d4)" },
                }}
            >
                {loading ? <CircularProgress size={22} color="inherit" /> : "Sign in"}
            </Button>
            <Divider />
            <Box sx={{ textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary" component="span">
                    Don't have an account?{" "}
                </Typography>
                <Link
                    component="button"
                    type="button"
                    variant="body2"
                    fontWeight={600}
                    onClick={() => onSwitch("signup")}
                >
                    Sign up
                </Link>
            </Box>
        </Box>
    );
}

function SignUpForm({ onSwitch }) {
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { register } = useContext(AccountContext);
    const navigate = useNavigate();

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }
        setLoading(true);
        try {
            await register(email, password, displayName);
            navigate("/dashboard");
        } catch (err) {
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={onSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
                label="Name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                fullWidth
                autoComplete="name"
                autoFocus
            />
            <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                autoComplete="email"
            />
            <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                autoComplete="new-password"
            />
            <TextField
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                fullWidth
                required
                autoComplete="new-password"
            />
            <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{
                    py: 1.5,
                    background: "linear-gradient(90deg, #740f87, #2421b7)",
                    "&:hover": { background: "linear-gradient(90deg, #8a1aa0, #3530d4)" },
                }}
            >
                {loading ? <CircularProgress size={22} color="inherit" /> : "Create account"}
            </Button>
            <Divider />
            <Box sx={{ textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary" component="span">
                    Already have an account?{" "}
                </Typography>
                <Link
                    component="button"
                    type="button"
                    variant="body2"
                    fontWeight={600}
                    onClick={() => onSwitch("signin")}
                >
                    Sign in
                </Link>
            </Box>
        </Box>
    );
}

function ResetForm({ onSwitch }) {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const { resetPassword } = useContext(AccountContext);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await resetPassword(email);
            setSent(true);
        } catch (err) {
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Alert severity="success">
                    Password reset email sent. Check your inbox (or the Firebase Emulator UI at{" "}
                    <Link href="http://localhost:4000" target="_blank" rel="noopener">
                        localhost:4000
                    </Link>{" "}
                    locally).
                </Alert>
                <Button variant="outlined" fullWidth onClick={() => onSwitch("signin")}>
                    Back to sign in
                </Button>
            </Box>
        );
    }

    return (
        <Box component="form" onSubmit={onSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography variant="body2" color="text.secondary">
                Enter your email and we'll send you a reset link.
            </Typography>
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
            <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{
                    py: 1.5,
                    background: "linear-gradient(90deg, #740f87, #2421b7)",
                    "&:hover": { background: "linear-gradient(90deg, #8a1aa0, #3530d4)" },
                }}
            >
                {loading ? <CircularProgress size={22} color="inherit" /> : "Send reset link"}
            </Button>
            <Box sx={{ textAlign: "center" }}>
                <Link component="button" type="button" variant="body2" onClick={() => onSwitch("signin")}>
                    Back to sign in
                </Link>
            </Box>
        </Box>
    );
}

export default function Login() {
    const [mode, setMode] = useState("signin");

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
            <Card sx={{ width: 400, borderRadius: 3, boxShadow: 10 }}>
                <CardContent sx={{ p: 4 }}>
                    <Header mode={mode} />
                    {mode === "signin" && <SignInForm onSwitch={setMode} />}
                    {mode === "signup" && <SignUpForm onSwitch={setMode} />}
                    {mode === "reset" && <ResetForm onSwitch={setMode} />}
                </CardContent>
            </Card>
        </Box>
    );
}
