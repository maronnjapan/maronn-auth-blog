import type { Article } from '@maronn-auth-blog/shared';

type ArticleWithAuthor = Article & {
  author?: {
    username: string;
  };
};

interface ArticleListProps {
  articles: ArticleWithAuthor[];
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
      {articles.map((article) => {
        const username = article.author?.username ?? article.userId;
        return (
        <article key={article.id} className="article-card">
          <h2>
            <a href={`/${username}/articles/${article.slug}`}>
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
      );
      })}
    </div>
  );
}
