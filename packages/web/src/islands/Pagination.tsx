interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export default function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages: (number | '...')[] = [];
  const showPages = 5;
  const halfShow = Math.floor(showPages / 2);

  let startPage = Math.max(1, currentPage - halfShow);
  let endPage = Math.min(totalPages, currentPage + halfShow);

  if (currentPage <= halfShow) {
    endPage = Math.min(totalPages, showPages);
  }
  if (currentPage > totalPages - halfShow) {
    startPage = Math.max(1, totalPages - showPages + 1);
  }

  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) {
      pages.push('...');
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pages.push('...');
    }
    pages.push(totalPages);
  }

  const getPageUrl = (page: number) => {
    const url = new URL(baseUrl, window.location.origin);
    url.searchParams.set('page', page.toString());
    return url.pathname + url.search;
  };

  return (
    <nav className="pagination" aria-label="ページナビゲーション">
      <ul>
        {currentPage > 1 && (
          <li>
            <a href={getPageUrl(currentPage - 1)} className="page-link prev">
              前へ
            </a>
          </li>
        )}

        {pages.map((page, index) =>
          page === '...' ? (
            <li key={`ellipsis-${index}`}>
              <span className="ellipsis">...</span>
            </li>
          ) : (
            <li key={page}>
              <a
                href={getPageUrl(page)}
                className={`page-link ${page === currentPage ? 'active' : ''}`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </a>
            </li>
          )
        )}

        {currentPage < totalPages && (
          <li>
            <a href={getPageUrl(currentPage + 1)} className="page-link next">
              次へ
            </a>
          </li>
        )}
      </ul>

      <style>{`
        .pagination {
          margin: 2rem 0;
        }

        .pagination ul {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          align-items: center;
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .page-link {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
          height: 40px;
          padding: 0 0.75rem;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          text-decoration: none;
          color: #666;
          background: white;
          transition: all 0.2s;
        }

        .page-link:hover {
          border-color: #0066cc;
          color: #0066cc;
        }

        .page-link.active {
          background: #0066cc;
          border-color: #0066cc;
          color: white;
        }

        .ellipsis {
          color: #999;
          padding: 0 0.5rem;
        }

        .prev, .next {
          font-weight: 500;
        }
      `}</style>
    </nav>
  );
}
