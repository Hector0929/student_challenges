import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider, useUser } from './contexts/UserContext';
import { FamilyOnboarding } from './pages/FamilyOnboarding';
import { RoleSelection } from './pages/RoleSelection';
import { ChildDashboard } from './pages/ChildDashboard';
import { ParentControl } from './pages/ParentControl';
import { ParentApproval } from './pages/ParentApproval';
import { ChildManagement } from './pages/ChildManagement';
import { ParentSettings } from './pages/ParentSettings';
import { DebugPage } from './pages/DebugPage';
import { useRealtimeSubscription } from './hooks/useRealtime';
import { LogOut, ArrowLeft, Lock } from 'lucide-react';
import type { Profile } from './types/database';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const { session, user, loginAsChild, loginAsParent, logout, exitProfile, lockParent, loading } = useUser();

  // Enable global realtime updates
  useRealtimeSubscription(user?.id);

  const [view, setView] = useState<'dashboard' | 'control' | 'children' | 'settings' | 'debug'>('dashboard');

  // ... (handlers)

  // ... (useEffect for midnight refresh)

  if (loading) {
    // ... loading UI
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center">
        <div className="text-xl font-pixel animate-pulse">Loading...</div>
      </div>
    );
  }

  // 1. Not Authenticated
  if (!session) {
    return <FamilyOnboarding />;
  }

  // 2. Authenticated but No Role
  if (!user) {
    return (
      <RoleSelection
        onChildSelected={handleChildSelected}
        onParentAuthenticated={handleParentAuth}
      />
    );
  }

  // 3. Authenticated and Role Selected
  return (
    <div className="min-h-screen bg-gradient-to-b from-pokeball-red to-pink-100 py-8 px-4">
      {/* Header / Logout Area */}
      <div className="max-w-6xl mx-auto mb-4 flex justify-between items-center bg-white/80 p-2 rounded-lg border-2 border-deep-black">
        <div className="font-pixel text-sm">
          {/* Current User Info */}
          👤 {user.name} ({user.role === 'parent' ? '家長' : '小小冒險家'})
        </div>

        <div className="flex gap-2">
          {user.role === 'parent' && (
            <button
              onClick={lockParent}
              className="flex items-center gap-2 px-3 py-1 bg-yellow-100 border-2 border-deep-black hover:bg-yellow-200 transition-colors font-pixel text-xs"
              title="鎖定家長模式"
            >
              <Lock size={14} />
              <span>鎖定</span>
            </button>
          )}

          {/* Exit Profile (Back to Role Selection) */}
          <button
            onClick={exitProfile}
            className="flex items-center gap-2 px-3 py-1 bg-white border-2 border-deep-black hover:bg-gray-100 transition-colors font-pixel text-xs"
            title="切換角色"
          >
            <ArrowLeft size={14} />
            <span>切換角色</span>
          </button>

          {/* Logout (Sign out from Family) */}
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-3 py-1 bg-red-100 border-2 border-deep-black hover:bg-red-200 transition-colors font-pixel text-xs text-red-600"
            title="登出家庭"
          >
            <LogOut size={14} />
            <span>登出家庭</span>
          </button>
        </div>
      </div>

      {user.role === 'child' ? (
        <ChildDashboard userId={user.id} />
      ) : (
        <>
          {/* Parent View Toggle */}
          <div className="max-w-6xl mx-auto mb-6">
            <div className="flex bg-white border-2 border-deep-black p-1 w-fit flex-wrap gap-1">
              <button
                onClick={() => setView('dashboard')}
                className={`px-4 py-2 font-pixel text-sm transition-colors ${view === 'dashboard'
                  ? 'bg-pokeball-red text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                孩子進度
              </button>
              <button
                onClick={() => setView('control')}
                className={`px-4 py-2 font-pixel text-sm transition-colors ${view === 'control'
                  ? 'bg-pokeball-red text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                任務管理
              </button>
              <button
                onClick={() => setView('children')}
                className={`px-4 py-2 font-pixel text-sm transition-colors ${view === 'children'
                  ? 'bg-pokeball-red text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                管理孩子
              </button>
              <button
                onClick={() => setView('settings')}
                className={`px-4 py-2 font-pixel text-sm transition-colors ${view === 'settings'
                  ? 'bg-pokeball-red text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                ⚙️ 設定
              </button>
              <button
                onClick={() => setView('debug')}
                className={`px-4 py-2 font-pixel text-sm transition-colors ${view === 'debug'
                  ? 'bg-pokeball-red text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                🐛 Debug
              </button>
            </div>
          </div>

          {view === 'dashboard' ? (
            <ParentApproval />
          ) : view === 'control' ? (
            <ParentControl />
          ) : view === 'children' ? (
            <ChildManagement />
          ) : view === 'settings' ? (
            <ParentSettings />
          ) : (
            <DebugPage />
          )}
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
