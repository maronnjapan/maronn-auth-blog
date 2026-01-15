import type { Article } from '@maronn-auth-blog/shared';

interface ArticleListProps {
  articles: Article[];
}

export default function ArticleList({ articles }: ArticleListProps) {
  if (articles.length === 0) {
    return (
      <div className="empty">
        <p>まだ記事がありません</p>
      </div>
    );
  }

  return (
    <div className="article-list">
      {articles.map((article) => (
        <article key={article.id} className="article-card">
          <h2>
            <a href={`/${article.userId}/articles/${article.slug}`}>
              {article.title}
            </a>
          </h2>
          {article.category && (
            <span className="category">{article.category}</span>
          )}
          <p className="meta">
            公開日: {new Date(article.publishedAt!).toLocaleDateString('ja-JP')}
          </p>
        </article>
      ))}
    </div>
  );
}
