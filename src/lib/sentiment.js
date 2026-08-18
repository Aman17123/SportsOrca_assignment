import Sentiment from 'sentiment';

const sentimentAnalyzer = new Sentiment();

/**
 * Analyze sentiment of a given text using AFINN.
 * @param {string} text - The text to analyze
 * @returns {number} Comparative score (between -1 and 1)
 */
const getSentimentScore = (text) => {
  const result = sentimentAnalyzer.analyze(text);
  return result.comparative; // This is score / number of tokens, normalized
};

/**
 * Classify a post based on its sentiment score.
 * @param {number} score - Comparative sentiment score
 * @returns {'positive' | 'neutral' | 'negative'} 
 */
const classifySentiment = (score) => {
  if (score > 0.15) return 'positive';
  if (score < -0.15) return 'negative';
  return 'neutral';
};

/**
 * Analyze an array of Reddit posts.
 * @param {Array} posts - Array of post objects from Reddit API
 * @returns {Object} Object containing the posts with sentiment and summary
 */
export const analyzePosts = (posts) => {
  // Analyze each post
  const postsWithSentiment = posts.map(post => {
    const score = getSentimentScore(post.title);
    const sentiment = classifySentiment(score);
    return {
      ...post,
      sentiment,
      sentimentScore: score,
    };
  });

  // Compute summary
  const total = postsWithSentiment.length;
  const counts = {
    positive: postsWithSentiment.filter(p => p.sentiment === 'positive').length,
    neutral: postsWithSentiment.filter(p => p.sentiment === 'neutral').length,
    negative: postsWithSentiment.filter(p => p.sentiment === 'negative').length,
  };

  const percentages = {
    positive: (counts.positive / total) * 100,
    neutral: (counts.neutral / total) * 100,
    negative: (counts.negative / total) * 100,
  };

  const averageScore =
    postsWithSentiment.reduce((sum, post) => sum + post.sentimentScore, 0) / total;

  // Determine overall vibe
  let vibe = 'Mixed-Neutral';
  if (percentages.positive > 60) vibe = 'Positive';
  else if (percentages.negative > 60) vibe = 'Negative';
  // Otherwise, it's mixed or neutral

  const summary = {
    total,
    counts,
    percentages: {
      positive: Number(percentages.positive.toFixed(2)),
      neutral: Number(percentages.neutral.toFixed(2)),
      negative: Number(percentages.negative.toFixed(2)),
    },
    averageScore: Number(averageScore.toFixed(3)),
    vibe,
  };

  return { posts: postsWithSentiment, summary };
};