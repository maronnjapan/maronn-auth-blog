import type { Context } from 'hono';
import { GITHUB_CSP } from '../utils/security';
import { GitHubEmbed, GitHubFallback } from '../components/GitHub';
import { ContentLoader, ErrorMessage } from '../components/Layout';

interface GitHubFileInfo {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  startLine?: number;
  endLine?: number;
}

/**
 * GitHub file embed handler
 * Displays code from GitHub files with syntax highlighting
 */
export async function githubHandler(c: Context): Promise<Response> {
  const url = c.req.query('url');

  // If no URL query, return loader that fetches from parent's data-content
  if (!url) {
    return c.html(<ContentLoader embedType="github" />);
  }

  const decodedUrl = decodeURIComponent(url);
  const fileInfo = parseGitHubUrl(decodedUrl);

  if (!fileInfo) {
    return c.html(<ErrorMessage message="無効なGitHub URLです" />, 400);
  }

  try {
    const content = await fetchGitHubFile(fileInfo);
    return c.html(
      <GitHubEmbed
        content={content}
        fileInfo={fileInfo}
        originalUrl={decodedUrl}
      />,
      200,
      {
        'Cache-Control': 'public, max-age=3600',
        'Content-Security-Policy': GITHUB_CSP,
      }
    );
  } catch (error) {
    console.error('Failed to fetch GitHub file:', error);
    return c.html(
      <GitHubFallback fileInfo={fileInfo} originalUrl={decodedUrl} />,
      200,
      {
        'Cache-Control': 'public, max-age=300',
        'Content-Security-Policy': GITHUB_CSP,
      }
    );
  }
}

/**
 * Parse GitHub file URL
 */
function parseGitHubUrl(url: string): GitHubFileInfo | null {
  const match = url.match(
    /github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+?)(?:#L(\d+)(?:-L(\d+))?)?$/
  );

  if (!match) {
    return null;
  }

  const [, owner, repo, branch, pathWithHash] = match;
  const path = pathWithHash.split('#')[0];
  const startLineMatch = url.match(/#L(\d+)/);
  const endLineMatch = url.match(/#L\d+-L(\d+)/);

  return {
    owner,
    repo,
    branch,
    path,
    startLine: startLineMatch ? parseInt(startLineMatch[1], 10) : undefined,
    endLine: endLineMatch ? parseInt(endLineMatch[1], 10) : undefined,
  };
}

/**
 * Fetch file content from GitHub raw
 */
async function fetchGitHubFile(fileInfo: GitHubFileInfo): Promise<string> {
  const rawUrl = `https://raw.githubusercontent.com/${fileInfo.owner}/${fileInfo.repo}/${fileInfo.branch}/${fileInfo.path}`;

  const response = await fetch(rawUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EmbedBot/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`);
  }

  return response.text();
}
