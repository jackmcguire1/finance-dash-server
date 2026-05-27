import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import axios from "axios";
import { useEffect, useState } from "react";

const SOURCES = ["All", "CoinTelegraph", "Decrypt", "CoinDesk"];

function timeAgo(ts) {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const SOURCE_LOGOS = {
    "cointelegraph.com": "https://cointelegraph.com/favicon.ico",
    "decrypt.co": "https://decrypt.co/favicon.ico",
    "coindesk.com": "https://www.coindesk.com/favicon.ico",
};

function NewsCardSkeleton() {
    return (
        <Card sx={{ borderRadius: 2, height: "100%", display: "flex", flexDirection: "column" }}>
            <Skeleton variant="rectangular" height={170} />
            <CardContent sx={{ flex: 1 }}>
                <Skeleton width="45%" height={14} sx={{ mb: 1 }} />
                <Skeleton height={18} />
                <Skeleton height={18} width="85%" />
                <Skeleton height={14} width="60%" sx={{ mt: 1 }} />
                <Skeleton height={14} width="75%" />
            </CardContent>
        </Card>
    );
}

function NewsCard({ article }) {
    return (
        <Card
            sx={{
                borderRadius: 2,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "transform 0.15s, box-shadow 0.15s",
                "&:hover": { transform: "translateY(-3px)", boxShadow: 8 },
            }}
        >
            <CardActionArea
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch" }}
            >
                {article.imageUrl ? (
                    <CardMedia
                        component="img"
                        height={170}
                        image={article.imageUrl}
                        alt={article.title}
                        sx={{ objectFit: "cover" }}
                    />
                ) : (
                    <Box
                        sx={{
                            height: 170,
                            background: "linear-gradient(135deg, rgba(116,15,135,0.3) 0%, rgba(36,33,183,0.3) 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Typography variant="h3" sx={{ opacity: 0.3 }}>₿</Typography>
                    </Box>
                )}

                <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.75, p: 2 }}>
                    {/* Source row */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        {SOURCE_LOGOS[article.sourceDomain] && (
                            <Box
                                component="img"
                                src={SOURCE_LOGOS[article.sourceDomain]}
                                alt={article.source}
                                sx={{ width: 14, height: 14, borderRadius: "2px", objectFit: "contain", flexShrink: 0 }}
                                onError={(e) => { e.target.style.display = "none"; }}
                            />
                        )}
                        <Typography variant="caption" color="primary.main" fontWeight={600} noWrap sx={{ flex: 1 }}>
                            {article.source}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
                            {timeAgo(article.publishedAt)}
                        </Typography>
                    </Box>

                    {/* Title */}
                    <Typography
                        variant="body2"
                        fontWeight={600}
                        lineHeight={1.45}
                        sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                        }}
                    >
                        {article.title}
                    </Typography>

                    {/* Excerpt */}
                    {article.description && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            lineHeight={1.5}
                            sx={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                flex: 1,
                            }}
                        >
                            {article.description}
                        </Typography>
                    )}
                </CardContent>
            </CardActionArea>
        </Card>
    );
}

export default function NewsView() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [source, setSource] = useState("All");

    useEffect(() => {
        setLoading(true);
        axios.get(`${import.meta.env.VITE_API_ENDPOINT}news`)
            .then((res) => { setArticles(res.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const visible = source === "All" ? articles : articles.filter((a) => a.source === source);

    return (
        <Box sx={{ maxWidth: 1200, mx: "auto" }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Crypto News</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.25}>
                        Latest from CoinTelegraph, Decrypt & CoinDesk
                    </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {SOURCES.map((s) => (
                        <Chip
                            key={s}
                            label={s}
                            size="small"
                            onClick={() => setSource(s)}
                            color={source === s ? "primary" : "default"}
                            variant={source === s ? "filled" : "outlined"}
                            sx={{ cursor: "pointer" }}
                        />
                    ))}
                </Box>
            </Box>

            <Grid container spacing={2}>
                {loading
                    ? Array.from({ length: 12 }).map((_, i) => (
                          <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                              <NewsCardSkeleton />
                          </Grid>
                      ))
                    : visible.map((article) => (
                          <Grid key={article.id} size={{ xs: 12, sm: 6, md: 4 }}>
                              <NewsCard article={article} />
                          </Grid>
                      ))}
                {!loading && visible.length === 0 && (
                    <Grid size={{ xs: 12 }}>
                        <Typography color="text.secondary" textAlign="center" py={8}>
                            No articles found.
                        </Typography>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
}
