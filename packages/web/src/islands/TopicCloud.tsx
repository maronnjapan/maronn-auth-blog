interface Topic {
  topic: string;
  count: number;
}

interface TopicCloudProps {
  topics: Topic[];
  selectedTopic?: string;
}

export default function TopicCloud({ topics, selectedTopic }: TopicCloudProps) {
  if (topics.length === 0) {
    return null;
  }

  const maxCount = Math.max(...topics.map(t => t.count));
  const minCount = Math.min(...topics.map(t => t.count));

  const getSize = (count: number) => {
    if (maxCount === minCount) return 1;
    const normalized = (count - minCount) / (maxCount - minCount);
    return 0.875 + normalized * 0.5; // 0.875rem to 1.375rem
  };

  return (
    <div className="topic-cloud">
      <h3>トピック</h3>
      <div className="topics">
        {topics.map(({ topic, count }) => (
          <a
            key={topic}
            href={`/?topic=${encodeURIComponent(topic)}`}
            className={`topic ${selectedTopic === topic ? 'active' : ''}`}
            style={{ fontSize: `${getSize(count)}rem` }}
          >
            {topic}
          </a>
        ))}
      </div>

      <style>{`
        .topic-cloud {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1rem;
          overflow: hidden;
        }

        .topic-cloud h3 {
          margin: 0 0 0.75rem 0;
          font-size: 1rem;
          color: #333;
        }

        .topics {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .topic {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: #f5f5f5;
          border-radius: 999px;
          text-decoration: none;
          color: #666;
          transition: all 0.2s;
          white-space: nowrap;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .topic:hover {
          background: #e0e0e0;
          color: #333;
        }

        .topic.active {
          background: #0066cc;
          color: white;
        }
      `}</style>
    </div>
  );
}
