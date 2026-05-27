import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import { MenuItem } from "@mui/material";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import axios from "axios";
import { useContext, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AccountContext } from "../Account";

const PortfolioImporter = () => {
    const { getSession } = useContext(AccountContext);
    const fileSelectorRef = useRef();
    const navigate = useNavigate();

    const [status, setStatus] = useState(null); // null | 'importing' | 'done' | 'error'

    const handleImportClicked = (event) => {
        event.preventDefault();
        fileSelectorRef.current.click();
    };

    const importPortfolio = (event) => {
        event.preventDefault();
        const file = event.target.files[0];
        // Reset so the same file can be re-selected
        event.target.value = "";
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (f) => {
            const parsed = JSON.parse(f.target.result);
            const portfolio = Array.isArray(parsed) ? parsed : parsed.portfolio;
            setStatus("importing");
            getSession()
                .then((session) => {
                    const endpoint = `${import.meta.env.VITE_API_ENDPOINT}portfolio/import`;
                    return axios.post(
                        endpoint,
                        { portfolio },
                        { headers: { Authorization: `Bearer ${session.token}` } },
                    );
                })
                .then(() => {
                    setStatus("done");
                    setTimeout(() => {
                        setStatus(null);
                        navigate("/holdings");
                        window.location.reload();
                    }, 1500);
                })
                .catch(() => {
                    setStatus("error");
                    setTimeout(() => setStatus(null), 3000);
                });
        };
        reader.readAsText(file);
    };

    return (
        <>
            <input
                style={{ display: "none" }}
                ref={fileSelectorRef}
                type="file"
                accept=".json"
                onChange={importPortfolio}
            />
            <MenuItem onClick={handleImportClicked}>Import portfolio</MenuItem>

            <Dialog open={status !== null} PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
                <DialogContent>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                            py: 2,
                            px: 3,
                            minWidth: 220,
                        }}
                    >
                        {status === "importing" && (
                            <>
                                <CircularProgress size={48} />
                                <Typography variant="body1" fontWeight={500}>
                                    Importing portfolio…
                                </Typography>
                            </>
                        )}
                        {status === "done" && (
                            <>
                                <CheckCircleOutlineIcon sx={{ fontSize: 48, color: "success.main" }} />
                                <Typography variant="body1" fontWeight={500}>
                                    Import complete!
                                </Typography>
                            </>
                        )}
                        {status === "error" && (
                            <>
                                <ErrorOutlineIcon sx={{ fontSize: 48, color: "error.main" }} />
                                <Typography variant="body1" fontWeight={500}>
                                    Import failed
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Check the file format and try again.
                                </Typography>
                            </>
                        )}
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default PortfolioImporter;
