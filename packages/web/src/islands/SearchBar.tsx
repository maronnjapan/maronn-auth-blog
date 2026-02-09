import { useState } from 'react';

interface SearchBarProps {
  initialQuery?: string;
  placeholder?: string;
}

export default function SearchBar({
  initialQuery = '',
  placeholder = '記事を検索...'
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/articles/search?q=${encodeURIComponent(query.trim())}`;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="search-input"
      />
      <button type="submit" className="search-button">
        検索
      </button>

      <style>{`
        .search-bar {
          display: flex;
          gap: 0.5rem;
          width: 100%;
          max-width: 500px;
        }

        .search-input {
          flex: 1;
          min-width: 0;
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

        .search-button {
          padding: 0.75rem 1.5rem;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .search-button:hover {
          background: #0052a3;
        }

        @media (max-width: 480px) {
          .search-input {
            padding: 0.6rem 0.75rem;
            font-size: 0.9rem;
          }

          .search-button {
            padding: 0.6rem 1rem;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </form>
  );
}
