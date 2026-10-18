import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { CalendarPage } from './features/calendar/CalendarPage';
import { FocusPage } from './features/focus/FocusPage';
import { InboxPage } from './features/inbox/InboxPage';
import { NotesPage } from './features/notes/NotesPage';
import { ProjectDetailPage } from './features/projects/ProjectDetailPage';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { RecoverPage } from './features/recover/RecoverPage';
import { SearchPage } from './features/search/SearchPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { TaskDetailPage } from './features/tasks/TaskDetailPage';
import { TasksPage } from './features/tasks/TasksPage';
import { TodayPage } from './features/today/TodayPage';
import { AppShell } from './shell/AppShell';
import { DataProvider } from './state/DataProvider';
import { UiProvider } from './state/UiProvider';
import { ThemeProvider } from './theme/ThemeProvider';

function NotFoundPage() {
  return (
    <div className="page">
      <h1>That page isn’t here</h1>
      <p className="quiet">The rest of your workspace is unchanged.</p>
      <Link to="/">Back to today</Link>
    </div>
  );
}

export function App({ databaseName }: { databaseName?: string }) {
  return (
    <ThemeProvider>
      <DataProvider databaseName={databaseName}>
        <BrowserRouter>
          <UiProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<TodayPage />} />
                <Route path="inbox" element={<InboxPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="tasks/:taskId" element={<TaskDetailPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="notes" element={<NotesPage />} />
                <Route path="notes/:noteId" element={<NotesPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/:projectId" element={<ProjectDetailPage />} />
                <Route path="focus" element={<FocusPage />} />
                <Route path="focus/:taskId" element={<FocusPage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="recover" element={<RecoverPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </UiProvider>
        </BrowserRouter>
      </DataProvider>
    </ThemeProvider>
  );
}
