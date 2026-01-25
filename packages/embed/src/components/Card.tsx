import type { FC } from 'hono/jsx';
import { EmbedLayout } from './Layout';
import type { OgpData } from '../utils/ogp';

interface LinkCardProps {
  ogp: OgpData;
  originalUrl: string;
}

const cardStyles = `
  .link-card {
    display: flex;
    border: 1px solid #e1e8ed;
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
    text-decoration: none;
    color: inherit;
    transition: background-color 0.2s, box-shadow 0.2s;
    max-width: 100%;
  }
  .link-card:hover {
    background: #f7f9fa;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  .card-image {
    flex-shrink: 0;
    width: 200px;
    height: 120px;
    overflow: hidden;
    background: #f0f2f5;
  }
  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .card-content {
    flex: 1;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    overflow: hidden;
  }
  .card-title {
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
    line-height: 1.4;
    margin-bottom: 4px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }
  .card-description {
    font-size: 13px;
    color: #65676b;
    line-height: 1.4;
    margin-bottom: 8px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }
  .card-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #8899a6;
    min-width: 0;
  }
  .card-favicon {
    width: 16px;
    height: 16px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .card-site-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* No image variant */
  .link-card.no-image {
    flex-direction: column;
  }
  .link-card.no-image .card-content {
    padding: 16px;
  }

  /* Fallback card */
  .fallback-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 1px solid #e1e8ed;
    border-radius: 12px;
    background: #fff;
    text-decoration: none;
    color: inherit;
    max-width: 100%;
    transition: background-color 0.2s;
  }
  .fallback-card:hover {
    background: #f7f9fa;
  }
  .fallback-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e1e8ed;
    border-radius: 8px;
    color: #8899a6;
  }
  .fallback-content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
  .fallback-title {
    font-size: 14px;
    font-weight: 600;
    color: #1a1a1a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fallback-url {
    font-size: 12px;
    color: #8899a6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Mobile styles */
  @media (max-width: 500px) {
    .link-card {
      flex-direction: column;
    }
    .card-image {
      width: 100%;
      height: auto;
      aspect-ratio: 1.91 / 1;
      max-height: 180px;
    }
    .card-content {
      padding: 12px;
    }
    .card-title {
      font-size: 14px;
      margin-bottom: 6px;
    }
    .card-description {
      font-size: 12px;
      -webkit-line-clamp: 2;
      margin-bottom: 8px;
    }
    .card-meta {
      font-size: 11px;
    }
    .card-favicon {
      width: 14px;
      height: 14px;
    }

    /* Fallback mobile */
    .fallback-card {
      padding: 12px;
      gap: 10px;
    }
    .fallback-icon {
      width: 36px;
      height: 36px;
    }
    .fallback-icon svg {
      width: 20px;
      height: 20px;
    }
    .fallback-title {
      font-size: 13px;
    }
    .fallback-url {
      font-size: 11px;
    }
  }
`;

/**
 * OGP link card component
 */
export const LinkCard: FC<LinkCardProps> = ({ ogp, originalUrl }) => {
  const domain = extractDomain(originalUrl);
  const hasImage = ogp.image && ogp.image.length > 0;
  const cardClass = hasImage ? 'link-card' : 'link-card no-image';

  return (
    <EmbedLayout title={ogp.title || domain} styles={cardStyles}>
      <a
        href={originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        class={cardClass}
      >
        {hasImage && (
          <div class="card-image">
            <img
              src={ogp.image}
              alt=""
              loading="lazy"
              onError="this.parentElement.style.display='none'"
            />
          </div>
        )}
        <div class="card-content">
          <div class="card-title">{ogp.title || domain}</div>
          {ogp.description && (
            <div class="card-description">{truncate(ogp.description, 120)}</div>
          )}
          <div class="card-meta">
            {ogp.favicon && (
              <img
                src={ogp.favicon}
                alt=""
                class="card-favicon"
                onError="this.style.display='none'"
              />
            )}
            <span class="card-site-name">{ogp.siteName || domain}</span>
          </div>
        </div>
      </a>
    </EmbedLayout>
  );
};

interface FallbackCardProps {
  url: string;
}

/**
 * Fallback card when OGP cannot be fetched
 */
export const FallbackCard: FC<FallbackCardProps> = ({ url }) => {
  const domain = extractDomain(url);

  return (
    <EmbedLayout title={domain} styles={cardStyles}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        class="fallback-card"
      >
        <div class="fallback-icon">
          <LinkIcon />
        </div>
        <div class="fallback-content">
          <div class="fallback-title">{domain}</div>
          <div class="fallback-url">{truncate(url, 50)}</div>
        </div>
      </a>
    </EmbedLayout>
  );
};

/**
 * Link icon SVG
 */
const LinkIcon: FC = () => (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
  </svg>
);

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * Truncate string
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
