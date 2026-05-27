import React, { useContext, useRef, useState } from "react";
import { AccountContext } from "./Account";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import PortfolioImporter from "./ImportExport/PortfolioImporter";

function getInitials(user) {
    if (user?.displayName) {
        return user.displayName
            .split(" ")
            .map(w => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
    }
    if (user?.email) return user.email[0].toUpperCase();
    return "?";
}

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 55%, 45%)`;
}

const Status = () => {
    const navigate = useNavigate();
    const { getSession, logout, user } = useContext(AccountContext);
    const downloadAnchorRef = useRef();
    const [anchorEl, setAnchorEl] = useState(null);
    const [fileDownloadUrl, setFileDownloadUrl] = useState("");
    const open = Boolean(anchorEl);

    const handleLogout = () => {
        logout();
        setAnchorEl(null);
        navigate("/login");
    };

    const handleExportPortfolio = () => {
        getSession()
            .then((session) => {
                const endpoint = `${import.meta.env.VITE_API_ENDPOINT}portfolio/export/?accountId=${session.idToken.payload.sub}`;
                return axios.get(endpoint);
            })
            .then((res) => {
                const blob = new Blob([JSON.stringify(res.data)]);
                const url = URL.createObjectURL(blob);
                setFileDownloadUrl(url);
                downloadAnchorRef.current.click();
                URL.revokeObjectURL(url);
                setFileDownloadUrl("");
            })
            .catch(console.error);
    };

    const initials = getInitials(user);
    const avatarColor = user ? stringToColor(user.uid) : "#666";

    return (
        <div>
            <a style={{ display: "none" }} href={fileDownloadUrl} download="portfolio.json" ref={downloadAnchorRef}>
                Download
            </a>

            <Button
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{ p: 0.5, minWidth: 0, borderRadius: 8 }}
            >
                <Avatar sx={{ bgcolor: avatarColor, width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
                    {initials}
                </Avatar>
            </Button>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{ sx: { minWidth: 200 } }}
            >
                {user && (
                    <Box sx={{ px: 2, py: 1.5 }}>
                        {user.displayName && (
                            <Typography variant="body2" fontWeight={600}>{user.displayName}</Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                    </Box>
                )}
                <Divider />
                <PortfolioImporter />
                <MenuItem onClick={handleExportPortfolio}>Export portfolio</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
        </div>
    );
};

export default Status;
