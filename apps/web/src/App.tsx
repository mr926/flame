import { Routes, Route, Navigate, useNavigate } from 'react-router';
import { useSession, usePages } from './api/hooks.js';
import { Layout } from './components/layout/Layout.js';
import { ThemeProvider } from './components/layout/ThemeProvider.js';
import { Spinner } from './components/ui/Primitives.js';
import { useEffect } from 'react';
import PageView from './pages/PageView.js';
import LoginPage from './pages/LoginPage.js';
import SetupPage from './pages/SetupPage.js';
import AppsPage from './pages/AppsPage.js';
import BookmarksPage from './pages/BookmarksPage.js';
import SettingsLayout from './pages/settings/SettingsLayout.js';
import GeneralSettings from './pages/settings/GeneralSettings.js';
import AppearanceSettings from './pages/settings/AppearanceSettings.js';
import IntegrationsSettings from './pages/settings/IntegrationsSettings.js';
import AboutSettings from './pages/settings/AboutSettings.js';
import GroupsSettings from './pages/settings/GroupsSettings.js';
import PagesSettings from './pages/settings/PagesSettings.js';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data: session, isLoading } = useSession();
  if (isLoading) return <div className="flex items-center justify-center h-screen"><Spinner /></div>;
  if (session?.setupRequired) return <Navigate to="/setup" replace />;
  if (!session?.authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { data: pages, isLoading } = usePages();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (pages && pages.length > 0) {
      navigate(`/p/${pages[0]!.slug}`, { replace: true });
    } else {
      navigate('/settings/pages', { replace: true });
    }
  }, [pages, isLoading, navigate]);

  return <div className="flex items-center justify-center h-screen"><Spinner /></div>;
}

export default function App() {
  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RootRedirect />} />
          <Route path="/p/:slug" element={<PageView />} />
          <Route
            path="/admin/apps"
            element={
              <RequireAuth>
                <AppsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/bookmarks"
            element={
              <RequireAuth>
                <BookmarksPage />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/settings/general" replace />} />
            <Route path="general" element={<GeneralSettings />} />
            <Route path="groups" element={<GroupsSettings />} />
            <Route path="pages" element={<PagesSettings />} />
            <Route path="appearance" element={<AppearanceSettings />} />
            <Route path="integrations" element={<IntegrationsSettings />} />
            <Route path="about" element={<AboutSettings />} />
          </Route>
        </Routes>
      </Layout>
    </ThemeProvider>
  );
}
