import { SearchPanel } from './SearchPanel';

export function SearchPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Search</h1>
          <p className="lede">Find a task, note, project, or capture.</p>
        </div>
      </header>
      <SearchPanel />
    </div>
  );
}
