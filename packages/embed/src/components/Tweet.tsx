import type { FC } from 'hono/jsx';
import { EmbedLayout } from './Layout';

interface TweetData {
  text: string;
  authorName: string;
  authorHandle: string;
  authorUrl: string;
  tweetUrl: string;
  date: string;
}

interface TweetCardProps {
  tweet: TweetData;
}

const tweetCardStyles = `
  .tweet-card {
    display: block;
    border: 1px solid #e1e8ed;
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
    text-decoration: none;
    color: inherit;
    transition: background-color 0.2s;
    max-width: 100%;
  }
  .tweet-card:hover {
    background: #f7f9fa;
  }
  .tweet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px 0;
  }
  .tweet-author {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .tweet-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #e1e8ed;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #536471;
  }
  .tweet-avatar svg {
    width: 24px;
    height: 24px;
  }
  .tweet-author-info {
    min-width: 0;
    overflow: hidden;
  }
  .tweet-author-name {
    font-weight: 700;
    font-size: 15px;
    color: #0f1419;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tweet-author-handle {
    font-size: 14px;
    color: #536471;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tweet-x-logo {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    color: #0f1419;
  }
  .tweet-content {
    padding: 12px 16px;
    font-size: 15px;
    line-height: 1.5;
    color: #0f1419;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .tweet-footer {
    padding: 0 16px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #536471;
  }
  .tweet-date {
    color: #536471;
  }
  .tweet-cta {
    color: #1d9bf0;
  }

  @media (max-width: 500px) {
    .tweet-header {
      padding: 10px 12px 0;
    }
    .tweet-avatar {
      width: 36px;
      height: 36px;
    }
    .tweet-avatar svg {
      width: 20px;
      height: 20px;
    }
    .tweet-author-name {
      font-size: 14px;
    }
    .tweet-author-handle {
      font-size: 13px;
    }
    .tweet-x-logo {
      width: 20px;
      height: 20px;
    }
    .tweet-content {
      padding: 10px 12px;
      font-size: 14px;
    }
    .tweet-footer {
      padding: 0 12px 10px;
      font-size: 13px;
    }
  }
`;

/**
 * Zenn-style tweet card component
 */
export const TweetCard: FC<TweetCardProps> = ({ tweet }) => {
  return (
    <EmbedLayout title={`Tweet by ${tweet.authorName}`} styles={tweetCardStyles}>
      <a
        href={tweet.tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="tweet-card"
      >
        <div class="tweet-header">
          <div class="tweet-author">
            <div class="tweet-avatar">
              <UserIcon />
            </div>
            <div class="tweet-author-info">
              <div class="tweet-author-name">{tweet.authorName}</div>
              <div class="tweet-author-handle">@{tweet.authorHandle}</div>
            </div>
          </div>
          <XLogo class="tweet-x-logo" />
        </div>
        <div class="tweet-content">{tweet.text}</div>
        <div class="tweet-footer">
          <span class="tweet-date">{tweet.date}</span>
          <span class="tweet-cta">- ポストを読む</span>
        </div>
      </a>
    </EmbedLayout>
  );
};

interface TweetFallbackProps {
  url: string;
}

const fallbackStyles = `
  .fallback-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px;
    border: 1px solid #e1e8ed;
    border-radius: 12px;
    background: #fff;
    text-decoration: none;
    color: #0f1419;
  }
  .fallback-link:hover {
    background: #f7f9fa;
  }
  .x-logo {
    width: 20px;
    height: 20px;
  }
  @media (max-width: 500px) {
    .fallback-link {
      padding: 12px;
      gap: 6px;
    }
    .x-logo {
      width: 18px;
      height: 18px;
    }
    .fallback-link span {
      font-size: 14px;
    }
  }
`;

/**
 * Fallback when tweet cannot be loaded
 */
export const TweetFallback: FC<TweetFallbackProps> = ({ url }) => {
  return (
    <EmbedLayout title="X Post" styles={fallbackStyles}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        class="fallback-link"
      >
        <XLogo class="x-logo" />
        <span>ポストを表示</span>
      </a>
    </EmbedLayout>
  );
};

/**
 * X (Twitter) logo SVG
 */
const XLogo: FC<{ class?: string }> = ({ class: className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" class={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/**
 * User icon SVG (placeholder for profile image)
 */
const UserIcon: FC = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

// Remove old TweetEmbed export - no longer needed
