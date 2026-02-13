import { useState } from 'react';
import type { NestedTocItem } from '../lib/toc';
import './TableOfContents.css';

interface TableOfContentsProps {
  items: NestedTocItem[];
  baseLevel: number;
}

interface TocItemProps {
  item: NestedTocItem;
  baseLevel: number;
  depth: number;
}

function TocItemComponent({ item, baseLevel, depth }: TocItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = item.children.length > 0;

  return (
    <li className={`toc-item toc-depth-${depth}`}>
      <div className="toc-item-container">
        <button
          className={`toc-toggle ${isOpen ? 'open' : 'closed'} ${!hasChildren ? 'hidden' : ''}`}
          onClick={hasChildren ? () => setIsOpen(!isOpen) : undefined}
          aria-label={hasChildren ? (isOpen ? '折りたたむ' : '展開する') : undefined}
          aria-expanded={hasChildren ? isOpen : undefined}
          aria-hidden={!hasChildren}
          tabIndex={hasChildren ? 0 : -1}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 5L6 7L8 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <a
          className={`toc-link ${hasChildren ? 'has-children' : ''}`}
          href={`#${item.id}`}
        >
          {item.text}
        </a>
      </div>
      {hasChildren && isOpen && (
        <ul className="toc-sublist">
          {item.children.map((child) => (
            <TocItemComponent
              key={child.id}
              item={child}
              baseLevel={baseLevel}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function TableOfContents({ items, baseLevel }: TableOfContentsProps) {
  if (items.length === 0) return null;

  return (
    <nav className="toc" aria-label="目次">
      <p className="toc-title">目次</p>
      <ul className="toc-list">
        {items.map((item) => (
          <TocItemComponent
            key={item.id}
            item={item}
            baseLevel={baseLevel}
            depth={0}
          />
        ))}
      </ul>
    </nav>
  );
}
