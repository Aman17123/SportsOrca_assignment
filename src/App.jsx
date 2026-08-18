import { useState } from "react";
import { fetchHotPosts } from "./lib/reddit";
import { analyzePosts } from "./lib/sentiment";

const QUICK_PICKS = ["technology", "AskReddit", "worldnews", "programming", "science"];

const SENTIMENT_STYLE = {
  positive: { tag: "bg-positive-bg text-positive border border-[#a7d9be]", bar: "bg-positive", text: "text-positive" },
  neutral: { tag: "bg-neutral-vibe-bg text-neutral-vibe border border-[#d1d5db]", bar: "bg-neutral-vibe", text: "text-neutral-vibe" },
  negative: { tag: "bg-negative-bg text-negative border border-[#fca5a5]", bar: "bg-negative", text: "text-negative" },
};

const VIBE_BADGE = {
  Positive: "bg-positive-bg text-positive",
  "Mixed-Neutral": "bg-neutral-vibe-bg text-neutral-vibe",
  Negative: "bg-negative-bg text-negative",
};

const formatNumber = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n);
const redditUrl = (permalink) => `https://www.reddit.com${permalink}`;

function App() {
  const [subreddit, setSubreddit] = useState("");
  const [posts, setPosts] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [active, setActive] = useState("");

  const fetchSubreddit = async (name) => {
    const clean = name.trim().replace(/^r\//, "");
    if (!clean) return;

    setLoading(true);
    setError(null);
    setPosts(null);
    setSummary(null);
    setActive(clean);

    try {
      const result = analyzePosts(await fetchHotPosts(clean, 50));
      setPosts(result.posts);
      setSummary(result.summary);
    } catch (err) {
      setError(err.message || "Failed to fetch posts.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchSubreddit(subreddit);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Header ── */}
      <header className="bg-surface-raised border-b border-border pt-12 pb-10 px-6 mb-10 max-sm:pt-8 max-sm:pb-7 max-sm:px-5">
        <div className="max-w-[1100px] mx-auto">
          <div className="inline-block text-[11px] font-semibold tracking-[0.08em] uppercase text-accent border border-current px-2 py-0.5 rounded-[6px] mb-[14px]">
            Sentiment Analysis
          </div>
          <h1 className="text-[clamp(26px,4vw,38px)] font-bold tracking-[-0.025em] text-primary leading-[1.2] mb-[10px]">
            Subreddit Vibe Check
          </h1>
          <p className="text-[15px] text-secondary max-w-[480px] leading-[1.6]">
            Analyze the sentiment of the top 50 hot posts from any subreddit
            using AFINN lexicon scoring.
          </p>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-[1100px] mx-auto px-6 pb-16 w-full max-sm:px-4 max-sm:pb-12">
        {/* Search */}
        <section className="mb-10">
          <form
            onSubmit={handleSubmit}
            className="flex gap-[10px] mb-4 items-stretch max-sm:flex-col"
          >
            <div className="flex items-center flex-1 border border-border rounded-[8px] bg-surface-raised overflow-hidden transition-[border-color,box-shadow] duration-150 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(26,25,23,0.06)]">
              <span className="pl-[14px] pr-[10px] text-[15px] font-medium text-muted select-none font-mono">
                r/
              </span>
              <input
                type="text"
                placeholder="subreddit name"
                value={subreddit}
                onChange={(e) => setSubreddit(e.target.value)}
                disabled={loading}
                aria-label="Subreddit name"
                className="flex-1 py-3 pr-[14px] border-none outline-none bg-transparent text-[15px] text-primary font-mono placeholder:text-muted disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="py-3 px-6 bg-primary text-white rounded-[8px] cursor-pointer text-sm font-semibold tracking-[0.01em] whitespace-nowrap transition-[background,transform] duration-150 hover:[&:not(:disabled)]:bg-[#2d2b28] active:[&:not(:disabled)]:translate-y-px disabled:bg-muted disabled:cursor-not-allowed max-sm:w-full max-sm:flex max-sm:justify-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-[14px] h-[14px] border-2 border-white/35 border-t-white rounded-full animate-spinner" />
                  Analyzing…
                </span>
              ) : (
                "Analyze"
              )}
            </button>
          </form>

          {/* Quick picks */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium text-muted">Popular:</span>
            {QUICK_PICKS.map((name) => (
              <button
                key={name}
                onClick={() => fetchSubreddit(name)}
                disabled={loading}
                className={`py-[5px] px-3 text-[13px] font-mono font-medium border rounded-[6px] cursor-pointer transition-[border-color,color,background] duration-150 disabled:opacity-45 disabled:cursor-not-allowed ${
                  active === name && (posts || error)
                    ? "bg-primary text-white border-primary"
                    : "text-secondary bg-surface-raised border-border hover:[&:not(:disabled)]:border-primary hover:[&:not(:disabled)]:text-primary hover:[&:not(:disabled)]:bg-surface"
                }`}
              >
                r/{name}
              </button>
            ))}
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12 px-6">
            <div className="loading-bar h-[2px] bg-border-subtle rounded-[2px] overflow-hidden mb-5 relative" />
            <p className="text-secondary text-sm">
              Fetching posts from r/{active}…
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="py-[14px] px-[18px] bg-[#fff5f5] border border-[#fecaca] rounded-[8px] text-negative text-sm mb-6"
            role="alert"
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results */}
        {!loading && !error && posts && summary && (
          <section className="animate-fadein">
            <div className="flex items-baseline gap-3 mb-6 max-sm:flex-col max-sm:gap-1">
              <h2 className="text-xl font-semibold text-primary">
                r/<span className="font-mono">{active}</span>
              </h2>
              <span className="text-[13px] text-muted">
                {summary.total} posts analyzed
              </span>
            </div>

            {/* Summary */}
            <div className="bg-surface-raised border border-border rounded-[12px] p-7 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[11px] font-semibold tracking-[0.07em] uppercase text-muted">
                  Sentiment Distribution
                </p>
                <span className={`inline-block text-xs font-semibold tracking-[0.04em] px-[10px] py-[3px] rounded-full uppercase ${VIBE_BADGE[summary.vibe]}`}>
                  {summary.vibe}
                </span>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-[10px] mb-6 max-[480px]:grid-cols-1">
                {["positive", "neutral", "negative"].map((key) => (
                  <div
                    key={key}
                    className={`flex flex-col items-center px-[10px] py-[14px] rounded-[8px] border text-center gap-0.5 ${SENTIMENT_STYLE[key].tag}`}
                  >
                    <span className={`text-[28px] font-bold leading-none tracking-[-0.03em] ${SENTIMENT_STYLE[key].text}`}>
                      {summary.counts[key]}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                      {key}
                    </span>
                    <span className="text-[13px] font-medium font-mono text-secondary">
                      {summary.percentages[key].toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Distribution bar */}
              <div className="flex h-2 rounded-full overflow-hidden bg-border-subtle mb-5">
                {["positive", "neutral", "negative"].map((key) => (
                  <div
                    key={key}
                    className={`${SENTIMENT_STYLE[key].bar}`}
                    style={{ width: `${summary.percentages[key]}%` }}
                  />
                ))}
              </div>

              {/* Meta */}
              <div className="flex flex-col border-t border-border-subtle pt-4">
                <div className="flex justify-between items-center py-[9px] border-b border-border-subtle text-sm last:border-b-0">
                  <span className="text-secondary">Total posts</span>
                  <strong className="font-semibold font-mono">{summary.total}</strong>
                </div>
                <div className="flex justify-between items-center py-[9px] text-sm">
                  <span className="text-secondary">Avg. sentiment score</span>
                  <strong className={`font-semibold font-mono ${summary.averageScore > 0 ? "text-positive" : summary.averageScore < 0 ? "text-negative" : ""}`}>
                    {summary.averageScore > 0 ? "+" : ""}
                    {summary.averageScore}
                  </strong>
                </div>
              </div>
            </div>

            {/* Posts table */}
            <div className="bg-surface-raised border border-border rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-[18px] border-b border-border">
                <h3 className="text-[15px] font-semibold">Post Details</h3>
                <span className="text-[13px] text-muted">
                  {posts.length} posts
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {["#", "Title", "Score", "Comments", "Sentiment"].map((col, i) => (
                        <th
                          key={col}
                          className={`py-[11px] px-4 text-xs font-semibold tracking-[0.05em] uppercase text-muted bg-bg border-b border-border whitespace-nowrap ${i === 0 || i === 2 || i === 3 ? "text-right w-20" : i === 1 ? "text-left min-w-[360px] max-sm:min-w-[220px]" : "text-left w-[110px]"}`}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post, idx) => (
                      <tr
                        key={post.id}
                        className="border-b border-border-subtle last:border-b-0 transition-colors duration-100 hover:bg-surface"
                      >
                        <td className="py-[13px] px-4 align-middle text-right text-muted text-xs font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-[13px] px-4 align-middle min-w-[360px] max-sm:min-w-[220px]">
                          <a
                            href={redditUrl(post.permalink)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary no-underline leading-[1.45] transition-colors duration-100 hover:text-accent hover:underline hover:underline-offset-2"
                          >
                            {post.title}
                          </a>
                        </td>
                        <td className="py-[13px] px-4 align-middle font-mono text-[13px] whitespace-nowrap text-right text-primary">
                          {formatNumber(post.score)}
                        </td>
                        <td className="py-[13px] px-4 align-middle font-mono text-[13px] whitespace-nowrap text-right text-primary">
                          {formatNumber(post.num_comments)}
                        </td>
                        <td className="py-[13px] px-4 align-middle">
                          <span className={`inline-block py-[3px] px-[9px] rounded-[6px] text-[11px] font-semibold uppercase tracking-[0.05em] ${SENTIMENT_STYLE[post.sentiment].tag}`}>
                            {post.sentiment}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loading && !error && !posts && (
          <div className="text-center py-[72px] px-6 text-muted">
            <div className="flex justify-center mb-4 opacity-35">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <p className="text-[15px]">
              Enter a subreddit name above to begin sentiment analysis.
            </p>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-[18px] px-6 text-center">
        <p className="text-xs text-muted">Made By Aman Nakoti</p>
        <a href="https://github.com/Aman17123">GitHub</a>
      </footer>
    </div>
  );
}

export default App;