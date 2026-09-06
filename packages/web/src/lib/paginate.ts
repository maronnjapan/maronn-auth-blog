export const ARTICLES_PER_PAGE = 20;

export interface Page<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
}

export function totalPageCount(itemCount: number, perPage = ARTICLES_PER_PAGE): number {
  return Math.max(1, Math.ceil(itemCount / perPage));
}

export function slicePage<T>(items: T[], currentPage: number, perPage = ARTICLES_PER_PAGE): Page<T> {
  const totalPages = totalPageCount(items.length, perPage);
  const start = (currentPage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    currentPage,
    totalPages,
  };
}

/** 1 ページ目は `/`、2 ページ目以降は `/page/2` のようなパスにする。 */
export function pageHref(page: number): string {
  return page <= 1 ? '/' : `/page/${page}`;
}
