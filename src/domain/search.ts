import type { Snapshot } from './types';

export interface SearchResult {
  id: string;
  type: 'task' | 'note' | 'project' | 'inbox';
  title: string;
  excerpt: string;
  href: string;
  rank: number;
}

function score(title: string, body: string, query: string): number | null {
  const q = query.toLowerCase();
  const normalizedTitle = title.toLowerCase();
  const normalizedBody = body.toLowerCase();
  if (normalizedTitle === q) return 0;
  if (normalizedTitle.startsWith(q)) return 1;
  if (normalizedTitle.includes(q)) return 2;
  if (normalizedBody.includes(q)) return 3;
  return null;
}

function excerpt(text: string, query: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const index = clean.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return clean.slice(0, 140);
  const start = Math.max(0, index - 36);
  const slice = clean.slice(start, start + 140);
  return `${start > 0 ? '…' : ''}${slice}${start + 140 < clean.length ? '…' : ''}`;
}

export function searchContent(snapshot: Snapshot, rawQuery: string, limit = 40): SearchResult[] {
  const query = rawQuery.trim();
  if (!query) return [];
  const results: SearchResult[] = [];

  for (const task of snapshot.tasks) {
    if (task.deletedAt || task.cancelledAt) continue;
    const rank = score(task.title, task.description, query);
    if (rank === null) continue;
    const parent = task.parentId ? snapshot.tasks.find((item) => item.id === task.parentId) : undefined;
    results.push({
      id: task.id,
      type: 'task',
      title: task.title || 'Untitled task',
      excerpt: task.parentId && parent ? `Step in ${parent.title}` : excerpt(task.description, query),
      href: `/tasks/${task.parentId ?? task.id}`,
      rank,
    });
  }

  for (const note of snapshot.notes) {
    if (note.deletedAt) continue;
    const title = note.title.trim() || 'Untitled';
    const rank = score(title, note.content, query);
    if (rank === null) continue;
    results.push({
      id: note.id,
      type: 'note',
      title,
      excerpt: excerpt(note.content, query),
      href: `/notes/${note.id}`,
      rank,
    });
  }

  for (const project of snapshot.projects) {
    const rank = score(project.name, project.description, query);
    if (rank === null) continue;
    results.push({
      id: project.id,
      type: 'project',
      title: project.name,
      excerpt: project.archivedAt ? 'Archived project' : excerpt(project.description, query),
      href: `/projects/${project.id}`,
      rank,
    });
  }

  for (const item of snapshot.inbox) {
    if (item.status === 'archived' || item.status === 'converted') continue;
    const rank = score(item.text, '', query);
    if (rank === null) continue;
    results.push({
      id: item.id,
      type: 'inbox',
      title: item.text.replace(/\s+/g, ' ').trim(),
      excerpt: 'Inbox',
      href: '/inbox',
      rank,
    });
  }

  return results
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title))
    .slice(0, limit);
}
