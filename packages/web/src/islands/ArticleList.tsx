import type { Article } from '@maronn-auth-blog/shared';
import { getTargetCategoryMeta } from '../lib/target-categories';

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
        const targetCategories = article.targetCategories ?? [];
        return (
          <a
            key={article.id}
            href={`/${username}/articles/${article.slug}`}
            className="article-card-link"
          >
            <article className="article-card">
              <div className="category-icons" aria-label="対象カテゴリ">
                {targetCategories.map((category) => {
                  const { icon, label, key } = getTargetCategoryMeta(category);
                  return (
                    <div key={key} className="category-icon" title={label}>
                      <span className="icon" aria-hidden="true">{icon}</span>
                      <span className="label">{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="article-card-content">
                <h2>{article.title}</h2>
                {article.category && (
                  <span className="category">{article.category}</span>
                )}
                <p className="meta">
                  公開日: {new Date(article.publishedAt!).toLocaleDateString('ja-JP')}
                </p>
              </div>
            </article>
          </a>
        );
      })}
    </div>
  );
}
