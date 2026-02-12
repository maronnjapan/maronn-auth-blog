interface ShareButtonsProps {
  url: string;
  title: string;
}

export default function ShareButtons({ url, title }: ShareButtonsProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const xShareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
  const hatenaShareUrl = `https://b.hatena.ne.jp/entry/s/${url.replace(/^https?:\/\//, '')}`;

  return (
    <div className="share-buttons">
      <span className="share-label">Share</span>
      <a
        href={xShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn share-btn-x"
        title="X (Twitter) で共有"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      <a
        href={hatenaShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn share-btn-hatena"
        title="はてなブックマークに追加"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M20.47 2H3.53A1.45 1.45 0 002 3.38v17.24A1.45 1.45 0 003.53 22h16.94A1.45 1.45 0 0022 20.62V3.38A1.45 1.45 0 0020.47 2zM8.09 17.33a1.54 1.54 0 01-1.56 1.56 1.56 1.56 0 010-3.12 1.54 1.54 0 011.56 1.56zM8 13.77H6v-2h2zm0-3.83H6V4h2zm8.09 7.28a4.82 4.82 0 01-1.57 1.49 7.1 7.1 0 01-2.28.78 12.35 12.35 0 01-2.74.26h-.78v-5.95h1.04a9.6 9.6 0 012.6.28 3.71 3.71 0 011.77 1.05 3.92 3.92 0 01.96 2.09z" />
        </svg>
      </a>
    </div>
  );
}
