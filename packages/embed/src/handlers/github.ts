import type { Context } from 'hono';
import { createEmbedHtml, createErrorHtml, escapeHtml } from '../utils/html-template';
import { createEmbedPageHtml } from '../utils/embed-page';
import { GITHUB_CSP } from '../utils/security';

/**
 * GitHub page handler - returns HTML page that loads GitHub file via JavaScript
 */
export function githubPageHandler(c: Context): Response {
  const html = createEmbedPageHtml({
    type: 'github',
    apiEndpoint: '/api/github',
  });
  return c.html(html);
}

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

  if (!url) {
    return c.html(createErrorHtml('URLが指定されていません'), 400);
  }

  const decodedUrl = decodeURIComponent(url);
  const fileInfo = parseGitHubUrl(decodedUrl);

  if (!fileInfo) {
    return c.html(createErrorHtml('無効なGitHub URLです'), 400);
  }

  try {
    const content = await fetchGitHubFile(fileInfo);
    const html = renderGitHubEmbed(content, fileInfo, decodedUrl);
    return c.html(html, 200, {
      'Cache-Control': 'public, max-age=3600',
      'Content-Security-Policy': GITHUB_CSP,
    });
  } catch (error) {
    console.error('Failed to fetch GitHub file:', error);
    return c.html(
      createFallbackGitHub(fileInfo, decodedUrl),
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
 * Supports:
 * - https://github.com/owner/repo/blob/branch/path/to/file
 * - https://github.com/owner/repo/blob/branch/path/to/file#L10
 * - https://github.com/owner/repo/blob/branch/path/to/file#L10-L20
 */
function parseGitHubUrl(url: string): GitHubFileInfo | null {
  const match = url.match(
    /github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+?)(?:#L(\d+)(?:-L(\d+))?)?$/
  );

  if (!match) {
    return null;
  }

  const [, owner, repo, branch, pathWithHash] = match;
  // Remove hash from path if present
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

/**
 * Get file extension for syntax highlighting
 */
function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    yml: 'yaml',
    yaml: 'yaml',
    json: 'json',
    md: 'markdown',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    sql: 'sql',
    graphql: 'graphql',
    vue: 'vue',
    svelte: 'svelte',
    dockerfile: 'dockerfile',
    toml: 'toml',
  };
  return languageMap[ext] || ext;
}

/**
 * Render GitHub file embed
 */
function renderGitHubEmbed(
  content: string,
  fileInfo: GitHubFileInfo,
  originalUrl: string
): string {
  const lines = content.split('\n');
  const startLine = fileInfo.startLine || 1;
  const endLine = fileInfo.endLine || lines.length;

  // Extract requested lines
  const displayLines = lines.slice(startLine - 1, endLine);
  const language = getLanguageFromPath(fileInfo.path);

  const codeHtml = displayLines
    .map((line, index) => {
      const lineNum = startLine + index;
      return `<tr>
        <td class="line-num">${lineNum}</td>
        <td class="line-code"><pre>${escapeHtml(line) || ' '}</pre></td>
      </tr>`;
    })
    .join('');

  const fileName = fileInfo.path.split('/').pop() || fileInfo.path;
  const lineInfo =
    fileInfo.startLine && fileInfo.endLine
      ? `Lines ${fileInfo.startLine}-${fileInfo.endLine}`
      : fileInfo.startLine
        ? `Line ${fileInfo.startLine}`
        : '';

  const embedContent = `
    <div class="github-embed">
      <div class="header">
        <a href="${escapeHtml(originalUrl)}" target="_blank" rel="noopener noreferrer" class="file-link">
          <svg class="github-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
            <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          <span class="repo-name">${escapeHtml(fileInfo.owner)}/${escapeHtml(fileInfo.repo)}</span>
          <span class="file-name">${escapeHtml(fileName)}</span>
        </a>
        ${lineInfo ? `<span class="line-info">${escapeHtml(lineInfo)}</span>` : ''}
      </div>
      <div class="code-container" data-language="${escapeHtml(language)}">
        <table class="code-table">
          <tbody>
            ${codeHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;

  return createEmbedHtml({
    content: embedContent,
    title: `${fileInfo.owner}/${fileInfo.repo} - ${fileName}`,
    styles: `
      .github-embed {
        border: 1px solid #d0d7de;
        border-radius: 6px;
        overflow: hidden;
        background: #ffffff;
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        background: #f6f8fa;
        border-bottom: 1px solid #d0d7de;
        font-size: 12px;
      }
      .file-link {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #0969da;
        text-decoration: none;
      }
      .file-link:hover {
        text-decoration: underline;
      }
      .github-icon {
        color: #57606a;
      }
      .repo-name {
        color: #0969da;
      }
      .file-name {
        color: #0969da;
        font-weight: 600;
      }
      .line-info {
        color: #57606a;
      }
      .code-container {
        overflow-x: auto;
        max-height: 400px;
        overflow-y: auto;
      }
      .code-table {
        border-collapse: collapse;
        width: 100%;
        font-size: 12px;
        line-height: 1.5;
      }
      .code-table tr:hover {
        background: #f6f8fa;
      }
      .line-num {
        width: 1%;
        min-width: 50px;
        padding: 0 16px;
        text-align: right;
        color: #57606a;
        user-select: none;
        vertical-align: top;
        background: #f6f8fa;
        border-right: 1px solid #d0d7de;
      }
      .line-code {
        padding: 0 16px;
        white-space: pre;
      }
      .line-code pre {
        margin: 0;
        font-family: inherit;
        background: transparent;
      }
    `,
  });
}

/**
 * Create fallback when file fetch fails
 */
function createFallbackGitHub(
  fileInfo: GitHubFileInfo,
  originalUrl: string
): string {
  const fileName = fileInfo.path.split('/').pop() || fileInfo.path;

  const content = `
    <a href="${escapeHtml(originalUrl)}" target="_blank" rel="noopener noreferrer" class="github-fallback">
      <svg class="github-icon" viewBox="0 0 16 16" width="32" height="32" fill="currentColor">
        <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
      </svg>
      <div class="info">
        <div class="repo">${escapeHtml(fileInfo.owner)}/${escapeHtml(fileInfo.repo)}</div>
        <div class="file">${escapeHtml(fileName)}</div>
      </div>
    </a>
  `;

  return createEmbedHtml({
    content,
    title: 'GitHub File',
    styles: `
      .github-fallback {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        border: 1px solid #d0d7de;
        border-radius: 6px;
        background: #f6f8fa;
        text-decoration: none;
        color: inherit;
      }
      .github-fallback:hover {
        background: #ebeef1;
      }
      .github-icon {
        color: #24292f;
      }
      .info {
        flex: 1;
      }
      .repo {
        font-size: 14px;
        color: #0969da;
      }
      .file {
        font-size: 12px;
        color: #57606a;
      }
    `,
  });
}
