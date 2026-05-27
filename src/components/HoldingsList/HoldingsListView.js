import Paper from "@mui/material/Paper";
import makeStyles from "@mui/styles/makeStyles";
import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AccountContext } from "../Account";
import ContentLoading from "../ContentLoading";
import HoldingsTable from "./HoldingsTable";

const useStyles = makeStyles((_theme) => ({}));

export default function HoldingsListView() {
    const classes = useStyles();

    const [holdings, setHoldings] = useState([]);
    const [contentLoading, setContentLoading] = useState(true);
    const [authFailed, setAuthFailed] = useState(false);

    const { getSession } = useContext(AccountContext);

    useEffect(() => {
        getSession()
            .then((session) => {
                const endpoint = `${import.meta.env.VITE_API_ENDPOINT}holdings/list/`;
                axios
                    .get(endpoint, { headers: { Authorization: `Bearer ${session.token}` } })
                    .then((res) => {
                        setHoldings(res.data.items);
                        setContentLoading(false);
                    });
            })
            .catch((_err) => {
                setAuthFailed(true);
            });
    }, [getSession]);

    if (authFailed) {
        return <Navigate to="/login" replace />;
    }

    return (
        <>
            {contentLoading ? (
                <ContentLoading />
            ) : (
                <div className={classes.root} component={Paper}>
                    <HoldingsTable holdings={holdings} setHoldings={setHoldings} />
                </div>
            )}
        </>
    );
}
