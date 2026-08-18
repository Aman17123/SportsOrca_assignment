/**
 * Reddit data fetcher — no API key required.
 *
 * Uses Reddit's public Atom/RSS feed which is always publicly accessible
 * and does not require any authentication.
 *
 * URL: https://www.reddit.com/r/{sub}/hot.rss
 * Proxied via Vite (/reddit-rss) to avoid browser CORS issues.
 */

// ─── Atom/RSS Parser ──────────────────────────────────────────────────────────

const parseAtomEntry = (entry) => {
  const text = (sel) => entry.querySelector(sel)?.textContent?.trim() ?? "";
  const attr = (sel, a) => entry.querySelector(sel)?.getAttribute(a) ?? "";

  const title  = text("title");
  const author = text("author name") || text("dc\\:creator") || "unknown";
  const rawId  = text("id"); // e.g. "t3_abc123"
  const id     = rawId.split("_").pop() || rawId || String(Math.random());

  // <link> in Atom is a self-closing element with an href attribute
  const link =
    attr("link[rel='alternate']", "href") ||
    attr("link", "href") ||
    text("link");

  let permalink = "";
  try {
    permalink = new URL(link).pathname;
  } catch {
    permalink = link;
  }

  // The Atom <content> is HTML — try to scrape score & comments
  const contentHtml = text("content");

  const scoreMatch   = contentHtml.match(/\b(\d[\d,]*)\s+point/i);
  const cmtMatch     = contentHtml.match(/\b(\d[\d,]*)\s+comment/i);
  const score        = scoreMatch ? parseInt(scoreMatch[1].replace(/,/g, ""), 10) : 0;
  const num_comments = cmtMatch   ? parseInt(cmtMatch[1].replace(/,/g, ""), 10)   : 0;

  // Try to extract a thumbnail image URL from the content HTML
  let thumbnail = null;
  const thumbMatch = contentHtml.match(
    /src="(https?:\/\/[^"]*\.(?:jpg|jpeg|png|gif|webp)[^"]*)"/i
  );
  if (thumbMatch) thumbnail = thumbMatch[1];

  const updated = text("updated") || text("published") || text("pubDate");

  return {
    id,
    title,
    author,
    score,
    num_comments,
    permalink,
    url: link,
    thumbnail,
    created_utc: Math.floor(new Date(updated || Date.now()).getTime() / 1000),
  };
};

const parseRedditFeed = (xmlText, subreddit) => {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xmlText, "application/xml");

  // DOMParser signals errors via a <parsererror> element
  if (doc.querySelector("parsererror")) {
    throw new Error("Failed to parse Reddit feed. The response was not valid XML.");
  }

  // Check for Reddit's "this community is private" message
  const feedTitle = doc.querySelector("feed > title, rss > channel > title")
    ?.textContent
    ?.toLowerCase() ?? "";

  if (feedTitle.includes("private")) {
    throw new Error(`r/${subreddit} is private or banned.`);
  }

  const entries = Array.from(doc.querySelectorAll("entry, item"));

  if (entries.length === 0) {
    // Could be an empty subreddit or an error response
    throw new Error(
      `No posts found in r/${subreddit}. The subreddit may not exist or may be empty.`
    );
  }

  return entries.map(parseAtomEntry);
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the top hot posts from a subreddit via Reddit's public RSS/Atom feed.
 * No API key or authentication required.
 *
 * @param {string} subreddit - Subreddit name (with or without "r/")
 * @param {number} limit     - Max posts to fetch (Reddit RSS caps at 100)
 * @returns {Promise<Array>} Array of normalised post objects
 */
export const fetchHotPosts = async (subreddit, limit = 50) => {
  const clean = subreddit.trim().replace(/^r\//, "");
  if (!clean) throw new Error("Enter a subreddit name");

  // Reddit RSS: https://www.reddit.com/r/{sub}/hot.rss?limit=N
  // Proxied via /reddit-rss to avoid browser CORS restrictions.
  const res = await fetch(
    `/reddit-rss/r/${clean}/hot.rss?limit=${limit}`,
    {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    }
  );

  if (res.status === 404) {
    throw new Error(`Subreddit r/${clean} not found.`);
  }

  if (res.status === 403) {
    throw new Error(`r/${clean} is private or banned.`);
  }

  if (res.status === 429) {
    throw new Error("Reddit is rate-limiting requests. Please wait a moment and try again.");
  }

  if (!res.ok) {
    throw new Error(
      `Failed to fetch posts (HTTP ${res.status}). Please check your connection and try again.`
    );
  }

  const text = await res.text();
  return parseRedditFeed(text, clean);
};