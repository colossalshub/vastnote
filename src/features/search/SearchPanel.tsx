import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchContent } from '../../domain/search';
import { useWorkspace } from '../../state/DataProvider';

const labels = {
  task: 'Task',
  note: 'Note',
  project: 'Project',
  inbox: 'Inbox',
} as const;

export function SearchPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { snapshot } = useWorkspace();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();
  const results = useMemo(() => searchContent(snapshot, query), [snapshot, query]);

  useEffect(() => setActive(0), [query]);

  function openResult(index: number) {
    const result = results[index];
    if (!result) return;
    onNavigate?.();
    navigate(result.href);
  }

  return (
    <div className="search-panel">
      <label className="sr-only" htmlFor="vastnote-search">
        Search Vastnote
      </label>
      <input
        id="vastnote-search"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={results[active] ? `${listId}-${results[active].type}-${results[active].id}` : undefined}
        type="search"
        value={query}
        placeholder="Search tasks, notes, projects, inbox"
        autoFocus
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && results.length) {
            event.preventDefault();
            setActive((index) => Math.min(results.length - 1, index + 1));
          }
          if (event.key === 'ArrowUp' && results.length) {
            event.preventDefault();
            setActive((index) => Math.max(0, index - 1));
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            openResult(active);
          }
        }}
      />
      {!query.trim() ? <p className="hint">Search tasks, notes, projects, and inbox items.</p> : null}
      {query.trim() && results.length === 0 ? <p>Nothing matches “{query.trim()}”.</p> : null}
      <ul id={listId} className="result-list" role="listbox" aria-label="Search results">
        {results.map((result, index) => (
          <li key={`${result.type}-${result.id}`} role="presentation">
            <button
              type="button"
              role="option"
              id={`${listId}-${result.type}-${result.id}`}
              aria-selected={index === active}
              className="result-button"
              onMouseEnter={() => setActive(index)}
              onClick={() => openResult(index)}
            >
              <span className="result-kicker">{labels[result.type]}</span>
              <span>{result.title}</span>
              {result.excerpt ? <span className="excerpt">{result.excerpt}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
