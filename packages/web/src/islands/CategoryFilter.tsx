interface Category {
  category: string;
  count: number;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory?: string;
}

export default function CategoryFilter({ categories, selectedCategory }: CategoryFilterProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="category-filter">
      <h3>カテゴリ</h3>
      <ul>
        <li>
          <a
            href="/"
            className={!selectedCategory ? 'active' : ''}
          >
            すべて
          </a>
        </li>
        {categories.map(({ category, count }) => (
          <li key={category}>
            <a
              href={`/?category=${encodeURIComponent(category)}`}
              className={selectedCategory === category ? 'active' : ''}
            >
              {category}
              <span className="count">({count})</span>
            </a>
          </li>
        ))}
      </ul>

      <style>{`
        .category-filter {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1rem;
        }

        .category-filter h3 {
          margin: 0 0 0.75rem 0;
          font-size: 1rem;
          color: #333;
        }

        .category-filter ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .category-filter li {
          margin: 0;
        }

        .category-filter a {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          margin: 0.25rem 0;
          border-radius: 4px;
          text-decoration: none;
          color: #666;
          transition: all 0.2s;
        }

        .category-filter a:hover {
          background: #f5f5f5;
          color: #333;
        }

        .category-filter a.active {
          background: #e6f0ff;
          color: #0066cc;
          font-weight: 500;
        }

        .count {
          font-size: 0.875rem;
          color: #999;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .category-filter a.active .count {
          color: #0066cc;
        }
      `}</style>
    </div>
  );
}
