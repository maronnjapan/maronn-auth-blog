import type { Context } from 'hono';
import { createEmbedHtml, createErrorHtml, escapeHtml } from '../utils/html-template';
import { createEmbedPageHtml } from '../utils/embed-page';

/**
 * Gist page handler - returns HTML page that loads Gist via JavaScript
 */
export function gistPageHandler(c: Context): Response {
  const html = createEmbedPageHtml({
    type: 'gist',
    apiEndpoint: '/api/gist',
  });
  return c.html(html);
}

interface GistFile {
  filename: string;
  language: string;
  content: string;
  truncated: boolean;
}

interface GistData {
  id: string;
  description: string;
  owner: {
    login: string;
    avatarUrl: string;
  };
  files: GistFile[];
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

/**
 * GitHub Gist embed handler
 */
export async function gistHandler(c: Context): Promise<Response> {
  const url = c.req.query('url');

  if (!url) {
    return c.html(createErrorHtml('URLが指定されていません'), 400);
  }

  const decodedUrl = decodeURIComponent(url);
  const gistInfo = parseGistUrl(decodedUrl);

  if (!gistInfo) {
    return c.html(createErrorHtml('無効なGist URLです'), 400);
  }

  try {
    const gistData = await fetchGist(gistInfo.id);
    const html = renderGist(gistData, gistInfo.file);
    return c.html(html, 200, {
      'Cache-Control': 'public, max-age=3600',
    });
  } catch (error) {
    console.error('Failed to fetch Gist:', error);
    return c.html(
      createFallbackGist(decodedUrl, gistInfo),
      200,
      { 'Cache-Control': 'public, max-age=300' }
    );
  }
}

/**
 * Parse Gist URL
 * Supports:
 * - https://gist.github.com/username/gistid
 * - https://gist.github.com/gistid
 * - https://gist.github.com/username/gistid?file=filename
 */
function parseGistUrl(
  url: string
): { id: string; username?: string; file?: string } | null {
  // Try pattern with username
  let match = url.match(/gist\.github\.com\/([^/]+)\/([a-f0-9]+)/i);
  if (match) {
    const fileMatch = url.match(/[?&]file=([^&]+)/);
    return {
      username: match[1],
      id: match[2],
      file: fileMatch ? decodeURIComponent(fileMatch[1]) : undefined,
    };
  }

  // Try pattern without username (just gist id)
  match = url.match(/gist\.github\.com\/([a-f0-9]+)/i);
  if (match) {
    const fileMatch = url.match(/[?&]file=([^&]+)/);
    return {
      id: match[1],
      file: fileMatch ? decodeURIComponent(fileMatch[1]) : undefined,
    };
  }

  return null;
}

/**
 * Fetch Gist data from GitHub API
 */
async function fetchGist(gistId: string): Promise<GistData> {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EmbedBot/1.0)',
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Gist: ${response.status}`);
  }

  const data = (await response.json()) as any;

  const files: GistFile[] = Object.values(data.files || {}).map((file: any) => ({
    filename: file.filename || 'unknown',
    language: file.language || 'Text',
    content: file.content || '',
    truncated: file.truncated || false,
  }));

  return {
    id: data.id,
    description: data.description || '',
    owner: {
      login: data.owner?.login || 'anonymous',
      avatarUrl:
        data.owner?.avatar_url ||
        'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
    },
    files,
    createdAt: data.created_at || '',
    updatedAt: data.updated_at || '',
    htmlUrl: data.html_url || `https://gist.github.com/${gistId}`,
  };
}

/**
 * Render Gist embed
 */
function renderGist(gist: GistData, selectedFile?: string): string {
  // Filter to specific file if requested
  const filesToShow = selectedFile
    ? gist.files.filter((f) => f.filename === selectedFile)
    : gist.files;

  if (filesToShow.length === 0 && selectedFile) {
    // If specific file not found, show all
    filesToShow.push(...gist.files);
  }

  const filesHtml = filesToShow
    .map((file) => {
      const lines = file.content.split('\n');
      const codeHtml = lines
        .map((line, index) => {
          return `<tr>
            <td class="line-num">${index + 1}</td>
            <td class="line-code"><pre>${escapeHtml(line) || ' '}</pre></td>
          </tr>`;
        })
        .join('');

      return `
        <div class="gist-file">
          <div class="file-header">
            <span class="filename">${escapeHtml(file.filename)}</span>
            <span class="language">${escapeHtml(file.language)}</span>
          </div>
          <div class="code-container">
            <table class="code-table">
              <tbody>
                ${codeHtml}
              </tbody>
            </table>
          </div>
          ${file.truncated ? '<div class="truncated">ファイルが切り詰められています。完全なファイルはGistで確認してください。</div>' : ''}
        </div>
      `;
    })
    .join('');

  const content = `
    <div class="gist-embed">
      <div class="gist-header">
        <a href="${escapeHtml(gist.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="gist-link">
          <img src="${escapeHtml(gist.owner.avatarUrl)}" alt="${escapeHtml(gist.owner.login)}" class="avatar">
          <span class="owner">${escapeHtml(gist.owner.login)}</span>
          <span class="separator">/</span>
          <span class="description">${escapeHtml(gist.description || gist.id)}</span>
        </a>
        <svg class="gist-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
      </div>
      ${filesHtml}
    </div>
  `;

  return createEmbedHtml({
    content,
    title: `Gist by ${gist.owner.login}`,
    styles: `
      .gist-embed {
        border: 1px solid #d0d7de;
        border-radius: 6px;
        overflow: hidden;
        background: #ffffff;
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      }
      .gist-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        background: #f6f8fa;
        border-bottom: 1px solid #d0d7de;
      }
      .gist-link {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #0969da;
        text-decoration: none;
        font-size: 14px;
        overflow: hidden;
      }
      .gist-link:hover {
        text-decoration: underline;
      }
      .avatar {
        width: 20px;
        height: 20px;
        border-radius: 50%;
      }
      .owner {
        font-weight: 600;
      }
      .separator {
        color: #57606a;
      }
      .description {
        color: #0969da;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .gist-icon {
        color: #57606a;
        flex-shrink: 0;
      }
      .gist-file {
        border-top: 1px solid #d0d7de;
      }
      .gist-file:first-child {
        border-top: none;
      }
      .file-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        background: #f6f8fa;
        border-bottom: 1px solid #d0d7de;
        font-size: 12px;
      }
      .filename {
        font-weight: 600;
        color: #24292f;
      }
      .language {
        color: #57606a;
      }
      .code-container {
        overflow-x: auto;
        max-height: 350px;
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
      .truncated {
        padding: 8px 16px;
        background: #fff8c5;
        border-top: 1px solid #d0d7de;
        font-size: 12px;
        color: #57606a;
        text-align: center;
      }
    `,
  });
}

/**
 * Create fallback when Gist fetch fails
 */
function createFallbackGist(
  originalUrl: string,
  gistInfo: { id: string; username?: string }
): string {
  const content = `
    <a href="${escapeHtml(originalUrl)}" target="_blank" rel="noopener noreferrer" class="gist-fallback">
      <svg class="gist-icon" viewBox="0 0 16 16" width="32" height="32" fill="currentColor">
        <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
      </svg>
      <div class="info">
        <div class="title">Gist を表示</div>
        <div class="meta">${gistInfo.username ? `${escapeHtml(gistInfo.username)} / ` : ''}${escapeHtml(gistInfo.id)}</div>
      </div>
    </a>
  `;

  return createEmbedHtml({
    content,
    title: 'GitHub Gist',
    styles: `
      .gist-fallback {
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
      .gist-fallback:hover {
        background: #ebeef1;
      }
      .gist-icon {
        color: #24292f;
      }
      .info {
        flex: 1;
      }
      .title {
        font-size: 14px;
        font-weight: 600;
        color: #0969da;
      }
      .meta {
        font-size: 12px;
        color: #57606a;
      }
    `,
  });
}
