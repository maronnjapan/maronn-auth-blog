import type { Article, TargetCategory } from '@maronn-auth-blog/shared';
import { getTargetCategoryMeta } from '../lib/target-categories';

type ArticleWithAuthor = Article & {
  author?: {
    username: string;
  };
};

interface UserArticleListProps {
  articles: ArticleWithAuthor[];
  username?: string;
}

export default function UserArticleList({ articles, username }: UserArticleListProps) {
  if (articles.length === 0) {
    return <div className="empty"><p>まだ記事がありません</p></div>;
  }

  return (
    <div className="article-list">
      {articles.map((article) => {
        const targetUsername = username ?? article.author?.username ?? article.userId;
        const targetCategories = article.targetCategories ?? [];
        return (
          <a
            key={article.id}
            href={`/${targetUsername}/articles/${article.slug}`}
            className="article-card-link"
          >
            <article className="article-card">
              <div className="category-icons" aria-label="対象カテゴリ">
                {targetCategories.map((category: TargetCategory) => {
                  const { icon, label, key, color, bgColor } = getTargetCategoryMeta(category);
                  return (
                    <div
                      key={key}
                      className="category-icon"
                      title={label}
                      style={{ backgroundColor: bgColor, color }}
                    >
                      <span className="icon" aria-hidden="true">{icon}</span>
                      <span className="label" style={{ color }}>{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="article-card-content">
                <h3>{article.title}</h3>
                {article.category && (
                  <span className="category">{article.category}</span>
                )}
                <div className="meta">
                  <p className="date">
                    公開日: {new Date(article.publishedAt!).toLocaleDateString('ja-JP')}
                  </p>
                  {article.updatedAt && new Date(article.updatedAt).getTime() !== new Date(article.publishedAt!).getTime() && (
                    <p className="date">
                      更新日: {new Date(article.updatedAt).toLocaleDateString('ja-JP')}
                    </p>
                  )}
                </div>
              </div>
            </article>
          </a>
        );
      })}
    </div>
  );
}
