import { useState } from 'react';
import type { NestedTocItem } from '../lib/toc';
import './MobileTableOfContents.css';

interface MobileTableOfContentsProps {
  items: NestedTocItem[];
  baseLevel: number;
}

interface TocItemProps {
  item: NestedTocItem;
  baseLevel: number;
  depth: number;
  onLinkClick: () => void;
}

function TocItemComponent({ item, baseLevel, depth, onLinkClick }: TocItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = item.children.length > 0;

  const handleLinkClick = () => {
    onLinkClick();
  };

  return (
    <li className={`mobile-toc-item mobile-toc-depth-${depth}`}>
      <div className="mobile-toc-item-container">
        {hasChildren && (
          <button
            className={`mobile-toc-toggle ${isOpen ? 'open' : 'closed'}`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? '折りたたむ' : '展開する'}
            aria-expanded={isOpen}
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
        )}
        <a
          className={`mobile-toc-link ${hasChildren ? 'has-children' : ''}`}
          href={`#${item.id}`}
          onClick={handleLinkClick}
        >
          {item.text}
        </a>
      </div>
      {hasChildren && isOpen && (
        <ul className="mobile-toc-sublist">
          {item.children.map((child) => (
            <TocItemComponent
              key={child.id}
              item={child}
              baseLevel={baseLevel}
              depth={depth + 1}
              onLinkClick={onLinkClick}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function MobileTableOfContents({
  items,
  baseLevel,
}: MobileTableOfContentsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (items.length === 0) return null;

  const handleLinkClick = () => {
    // Close the TOC when a link is clicked
    setIsExpanded(false);
  };

  return (
    <div className="mobile-toc-container">
      <button
        className={`mobile-toc-header ${isExpanded ? 'expanded' : 'collapsed'}`}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="mobile-toc-header-text">目次</span>
        <svg
          className="mobile-toc-header-icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isExpanded && (
        <nav className="mobile-toc-content" aria-label="目次">
          <ul className="mobile-toc-list">
            {items.map((item) => (
              <TocItemComponent
                key={item.id}
                item={item}
                baseLevel={baseLevel}
                depth={0}
                onLinkClick={handleLinkClick}
              />
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
