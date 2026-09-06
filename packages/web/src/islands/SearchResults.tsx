import { useState } from 'react';
import ArticleList from './ArticleList';
import type { ArticleMeta } from '../lib/content';
import { getTargetCategoryMeta } from '../lib/target-categories';

interface SearchResultsProps {
  articles: ArticleMeta[];
}

/** 全角・半角と大文字小文字の差を無視して比較するための正規化。 */
function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase();
}

function searchTargetOf(article: ArticleMeta): string {
  return normalize(
    [
      article.title,
      article.excerpt,
      ...article.topics,
      ...article.targetCategories.map((category) => getTargetCategoryMeta(category).label),
    ].join(' ')
  );
}

function match(article: ArticleMeta, terms: string[]): boolean {
  const target = searchTargetOf(article);
  return terms.every((term) => target.includes(term));
}

/**
 * 静的サイトなので検索はクライアント側で行う。
 * 記事数が少ないため索引は props でそのまま埋め込んでいる。
 */
export default function SearchResults({ articles }: SearchResultsProps) {
  // client:only で描画されるため、初期値として URL のクエリを直接読める。
  const [query, setQuery] = useState(
    () => new URLSearchParams(window.location.search).get('q') ?? ''
  );

  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const results = terms.length === 0 ? [] : articles.filter((article) => match(article, terms));

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setQuery(next);
    const url = next.trim() ? `?q=${encodeURIComponent(next.trim())}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  };

  return (
    <div className="search-results">
      <form className="search-form" role="search" onSubmit={(event) => event.preventDefault()}>
        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder="記事を検索..."
          aria-label="記事を検索"
          className="search-input"
          autoFocus
        />
      </form>

      {terms.length === 0 ? (
        <p className="hint">キーワードを入力すると、タイトル・トピック・本文の冒頭から記事を絞り込みます。</p>
      ) : (
        <>
          <p className="count">{results.length} 件見つかりました</p>
          <ArticleList articles={results} emptyMessage="一致する記事がありませんでした" />
        </>
      )}

      <style>{`
        .search-form {
          margin-bottom: 1.5rem;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #0066cc;
        }

        .hint,
        .count {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}
