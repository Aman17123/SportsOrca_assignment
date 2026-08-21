/**
 * Reddit data fetcher — via FetchLayer API.
 *
 * Uses FetchLayer's Reddit scraping API (https://fetchlayer.dev) which
 * doesn't require Reddit API credentials.
 *
 * Docs: https://fetchlayer.dev/documentation/reddit/endpoints/community-posts
 *
 * Authentication: Bearer token via VITE_FETCHLAYER_API_KEY env variable.
 * Proxied via Vite (/fetchlayer) to avoid exposing the key in the browser
 * and to avoid CORS issues.
 */

// ─── Normaliser ───────────────────────────────────────────────────────────────

/**
 * Normalise a FetchLayer community-posts item into the shape the rest of
 * the app expects (same shape as the old Reddit RSS parser).
 *
 * @param {object} item - A single item from the FetchLayer `items` array
 * @returns {object} Normalised post object
 */
const normaliseItem = (item) => {
  // createdAt is ISO-8601; convert to Unix seconds for compatibility
  const created_utc = item.createdAt
    ? Math.floor(new Date(item.createdAt).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  return {
    id:           item.id ?? String(Math.random()),
    title:        item.title ?? "(no title)",
    author:       item.author ?? "unknown",
    score:        item.score ?? 0,
    num_comments: item.commentCount ?? 0,
    permalink:    item.permalink ?? "",
    url:          item.url ?? item.permalink ?? "",
    thumbnail:    item.thumbnailUrl ?? null,
    created_utc,
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the top hot posts from a subreddit via FetchLayer's Reddit API.
 *
 * @param {string} subreddit - Subreddit name (with or without "r/")
 * @param {number} limit     - Max posts to return (default 50)
 * @param {string} sort      - Sort order: "hot" | "new" | "top" | "rising" | "controversial"
 * @returns {Promise<Array>} Array of normalised post objects
 */
export const fetchHotPosts = async (subreddit, limit = 50, sort = "hot") => {
  const clean = subreddit.trim().replace(/^r\//, "");
  if (!clean) throw new Error("Enter a subreddit name");

  // Proxied via /fetchlayer to keep the API key server-side during dev
  // and to avoid CORS. In production, you'd hit the FetchLayer API directly
  // from a backend (or use an environment-specific proxy).
  const res = await fetch("/fetchlayer/reddit/community-posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // The Vite proxy injects the Authorization header, so we don't expose
      // the key in the browser bundle.
    },
    body: JSON.stringify({
      subreddit: clean,
      sort,
      limit,
    }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "FetchLayer API key is invalid or missing. Check VITE_FETCHLAYER_API_KEY in your .env file."
    );
  }

  if (res.status === 429) {
    throw new Error(
      "FetchLayer rate limit reached. Please wait a moment and try again."
    );
  }

  if (!res.ok) {
    throw new Error(
      `Failed to fetch posts (HTTP ${res.status}). Please check your connection and try again.`
    );
  }

  const data = await res.json();

  // FetchLayer signals a Reddit block via data.blocked
  if (data.blocked) {
    const reason = data.blockReason ?? "unknown reason";
    throw new Error(`Reddit blocked the request (${reason}). Try again later.`);
  }

  const items = data.items ?? [];

  if (items.length === 0) {
    throw new Error(
      `No posts found in r/${clean}. The subreddit may not exist or may be empty.`
    );
  }

  return items.map(normaliseItem);
};