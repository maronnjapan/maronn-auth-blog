interface Tag {
  tag: string;
  count: number;
}

interface TagCloudProps {
  tags: Tag[];
  selectedTag?: string;
}

export default function TagCloud({ tags, selectedTag }: TagCloudProps) {
  if (tags.length === 0) {
    return null;
  }

  const maxCount = Math.max(...tags.map(t => t.count));
  const minCount = Math.min(...tags.map(t => t.count));

  const getSize = (count: number) => {
    if (maxCount === minCount) return 1;
    const normalized = (count - minCount) / (maxCount - minCount);
    return 0.875 + normalized * 0.5; // 0.875rem to 1.375rem
  };

  return (
    <div className="tag-cloud">
      <h3>タグ</h3>
      <div className="tags">
        {tags.map(({ tag, count }) => (
          <a
            key={tag}
            href={`/?tag=${encodeURIComponent(tag)}`}
            className={`tag ${selectedTag === tag ? 'active' : ''}`}
            style={{ fontSize: `${getSize(count)}rem` }}
          >
            {tag}
          </a>
        ))}
      </div>

      <style>{`
        .tag-cloud {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1rem;
        }

        .tag-cloud h3 {
          margin: 0 0 0.75rem 0;
          font-size: 1rem;
          color: #333;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tag {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: #f5f5f5;
          border-radius: 999px;
          text-decoration: none;
          color: #666;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tag:hover {
          background: #e0e0e0;
          color: #333;
        }

        .tag.active {
          background: #0066cc;
          color: white;
        }
      `}</style>
    </div>
  );
}
