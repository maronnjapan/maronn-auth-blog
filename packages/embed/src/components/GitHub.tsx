import type { FC } from 'hono/jsx';
import { EmbedLayout } from './Layout';

interface GitHubFileInfo {
  owner: string;
  repo: string;
  path: string;
  startLine?: number;
  endLine?: number;
}

interface GitHubEmbedProps {
  content: string;
  fileInfo: GitHubFileInfo;
  originalUrl: string;
}

const githubStyles = `
  .github-embed {
    border: 1px solid #d0d7de;
    border-radius: 6px;
    overflow: hidden;
    background: #ffffff;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  }
  .github-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #f6f8fa;
    border-bottom: 1px solid #d0d7de;
    font-size: 12px;
  }
  .github-link {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #0969da;
    text-decoration: none;
  }
  .github-link:hover {
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
  .fallback-repo {
    font-size: 14px;
    color: #0969da;
  }
  .fallback-file {
    font-size: 12px;
    color: #57606a;
  }
`;

/**
 * GitHub file embed component
 */
export const GitHubEmbed: FC<GitHubEmbedProps> = ({
  content,
  fileInfo,
  originalUrl,
}) => {
  const lines = content.split('\n');
  const startLine = fileInfo.startLine || 1;
  const endLine = fileInfo.endLine || lines.length;
  const displayLines = lines.slice(startLine - 1, endLine);
  const fileName = fileInfo.path.split('/').pop() || fileInfo.path;

  const lineInfo =
    fileInfo.startLine && fileInfo.endLine
      ? `Lines ${fileInfo.startLine}-${fileInfo.endLine}`
      : fileInfo.startLine
        ? `Line ${fileInfo.startLine}`
        : '';

  return (
    <EmbedLayout title={`${fileInfo.owner}/${fileInfo.repo} - ${fileName}`} styles={githubStyles}>
      <div class="github-embed">
        <div class="github-header">
          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="github-link"
          >
            <GitHubIcon />
            <span class="repo-name">
              {fileInfo.owner}/{fileInfo.repo}
            </span>
            <span class="file-name">{fileName}</span>
          </a>
          {lineInfo && <span class="line-info">{lineInfo}</span>}
        </div>
        <div class="code-container">
          <table class="code-table">
            <tbody>
              {displayLines.map((line, index) => (
                <tr>
                  <td class="line-num">{startLine + index}</td>
                  <td class="line-code">
                    <pre>{line || ' '}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </EmbedLayout>
  );
};

interface GitHubFallbackProps {
  fileInfo: GitHubFileInfo;
  originalUrl: string;
}

/**
 * Fallback when GitHub file cannot be loaded
 */
export const GitHubFallback: FC<GitHubFallbackProps> = ({
  fileInfo,
  originalUrl,
}) => {
  const fileName = fileInfo.path.split('/').pop() || fileInfo.path;

  return (
    <EmbedLayout title="GitHub File" styles={githubStyles}>
      <a
        href={originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="github-fallback"
      >
        <GitHubIcon size={32} />
        <div>
          <div class="fallback-repo">
            {fileInfo.owner}/{fileInfo.repo}
          </div>
          <div class="fallback-file">{fileName}</div>
        </div>
      </a>
    </EmbedLayout>
  );
};

/**
 * GitHub icon SVG
 */
const GitHubIcon: FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    viewBox="0 0 16 16"
    width={size}
    height={size}
    fill="currentColor"
    class="github-icon"
  >
    <path
      fill-rule="evenodd"
      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
    />
  </svg>
);
