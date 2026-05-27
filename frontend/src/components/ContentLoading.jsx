import { CircularProgress } from "@mui/material";

export default function ContentLoading() {
    return (
        <div style={{ height: "500px", display: "flex" }}>
            <CircularProgress color="primary" sx={{ margin: "auto" }} />
        </div>
    );
}
