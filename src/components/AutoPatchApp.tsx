'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PublicConfig } from '@/lib/types';
import { fetchPublicConfig } from '@/lib/api';
import { useWorkflowRun } from '@/hooks/useWorkflowRun';
import { useRunHistory } from '@/hooks/useRunHistory';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { WorkspacePage } from '@/components/views/WorkspacePage';
import { HistoryPage } from '@/components/views/HistoryPage';
import { SettingsPage } from '@/components/views/SettingsPage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { getAppState, setAppState } from '@/lib/indexeddb';

export interface AutoPatchAppProps {
  initialTab?: 'workspace' | 'history' | 'settings';
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}

export const AutoPatchApp: React.FC<AutoPatchAppProps> = ({
  initialTab = 'workspace',
  className,
  id,
  style,
}) => {
  const [activeTab, setActiveTab] = useState<'workspace' | 'history' | 'settings'>(initialTab);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(false);

  const {
    run,
    isLoading: isRunLoading,
    error: runError,
    start: startRun,
    loadRun,
    cancel: cancelRun,
    refine: refineRun,
    reset: resetRun,
  } = useWorkflowRun();

  const {
    history,
    loading: historyLoading,
    refreshHistory,
    deleteHistoryItem,
    clearAllHistory,
  } = useRunHistory();

  const loadConfig = useCallback(async () => {
    setIsConfigLoading(true);
    try {
      const data = await fetchPublicConfig();
      setConfig(data);
    } catch (err) {
      console.error('Failed to load system config:', err);
    } finally {
      setIsConfigLoading(false);
    }
  }, []);

  // Restore active tab and load config on mount
  useEffect(() => {
    let mounted = true;

    fetchPublicConfig()
      .then((data) => {
        if (mounted) setConfig(data);
      })
      .catch((err) => {
        console.error('Failed to load system config:', err);
      });

    getAppState<'workspace' | 'history' | 'settings'>('activeTab')
      .then((savedTab) => {
        if (mounted && savedTab) {
          setActiveTab(savedTab);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const handleTabChange = (tab: 'workspace' | 'history' | 'settings') => {
    setActiveTab(tab);
    setAppState('activeTab', tab).catch(() => {});
  };

  const handleSelectRun = async (runId: string) => {
    await loadRun(runId);
    handleTabChange('workspace');
  };

  const handleNewRun = () => {
    resetRun();
    handleTabChange('workspace');
  };

  const handleStartRun = async (params: {
    repoUrl: string;
    issueNumber: number;
    additionalInstructions?: string;
    targetBranch?: string;
  }) => {
    await startRun(params);
    refreshHistory();
  };

  const handleDeleteRun = async (runId: string) => {
    if (run?.id === runId) {
      resetRun();
    }
    await deleteHistoryItem(runId);
  };

  const handleClearHistory = async () => {
    resetRun();
    await clearAllHistory();
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div
      id={id}
      className={className ? `autopatch-app ${className}` : 'autopatch-app'}
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', ...style }}
    >
      <Header
        config={config}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onNewRun={handleNewRun}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
      />

      <div className="app-body-container" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          history={history}
          selectedRunId={run?.id}
          onSelectRun={handleSelectRun}
          onRefresh={refreshHistory}
          onDeleteRun={handleDeleteRun}
          collapsed={!isSidebarOpen || activeTab !== 'workspace'}
          onToggleCollapse={() => setIsSidebarOpen(false)}
        />

        <main
          role="main"
          aria-label="Main Application Content"
          style={{ flex: 1, overflowY: 'auto', height: 'calc(100vh - 61px)' }}
        >
          <ErrorBoundary>
            {activeTab === 'workspace' && (
              <WorkspacePage
                run={run}
                isLoading={isRunLoading}
                error={runError}
                config={config}
                onStartRun={handleStartRun}
                onCancelRun={cancelRun}
                onRefineRun={refineRun}
                onNewRun={handleNewRun}
              />
            )}

            {activeTab === 'history' && (
              <HistoryPage
                history={history}
                loading={historyLoading}
                onSelectRun={handleSelectRun}
                onNewRun={handleNewRun}
                onDeleteRun={handleDeleteRun}
                onClearHistory={handleClearHistory}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsPage
                config={config}
                onRefreshConfig={loadConfig}
                loading={isConfigLoading}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default AutoPatchApp;
