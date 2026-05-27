import axios from "axios";
import type { FastifyInstance } from "fastify";

export interface NewsArticle {
    id: string;
    title: string;
    description: string;
    url: string;
    imageUrl: string | null;
    source: string;
    sourceDomain: string;
    publishedAt: number;
}

const FEEDS = [
    { url: "https://cointelegraph.com/rss", source: "CoinTelegraph", domain: "cointelegraph.com" },
    { url: "https://decrypt.co/feed", source: "Decrypt", domain: "decrypt.co" },
    { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk", domain: "coindesk.com" },
];

function extractTag(xml: string, tag: string): string {
    const m = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i"));
    return m ? m[1].trim() : "";
}

function extractAttr(xml: string, tag: string, attr: string): string {
    const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, "i"));
    return m ? m[1].trim() : "";
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim();
}

function parseItems(xml: string, source: string, domain: string): NewsArticle[] {
    const items: NewsArticle[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];
        const title = stripHtml(extractTag(block, "title"));
        const url = stripHtml(extractTag(block, "link")) || extractAttr(block, "link", "href");
        const rawDesc = extractTag(block, "description");
        const description = stripHtml(rawDesc).slice(0, 200);
        const pubDate = extractTag(block, "pubDate") || extractTag(block, "atom:updated");
        const publishedAt = pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : 0;

        // image: try media:content, then enclosure, then img in description
        let imageUrl: string | null =
            extractAttr(block, "media:content", "url") ||
            extractAttr(block, "enclosure", "url") ||
            (rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null);

        if (!title || !url) continue;
        items.push({ id: url, title, description, url, imageUrl, source, sourceDomain: domain, publishedAt });
    }
    return items;
}

let cache: { articles: NewsArticle[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchAllNews(): Promise<NewsArticle[]> {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) return cache.articles;

    const results = await Promise.allSettled(
        FEEDS.map(async ({ url, source, domain }) => {
            const { data } = await axios.get<string>(url, {
                headers: { "User-Agent": "Mozilla/5.0 (compatible; finance-dash/1.0)" },
                timeout: 8000,
                responseType: "text",
            });
            return parseItems(data, source, domain);
        }),
    );

    const articles = results
        .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
        .sort((a, b) => b.publishedAt - a.publishedAt)
        .slice(0, 40);

    cache = { articles, fetchedAt: Date.now() };
    return articles;
}

export async function newsRoutes(app: FastifyInstance): Promise<void> {
    app.get("/news", async (_req, reply) => {
        const articles = await fetchAllNews();
        return reply.send(articles);
    });
}
