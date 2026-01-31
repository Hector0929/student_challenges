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
import { HomeButton } from './components/HomeButton';
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

  // Handler for child selection
  const handleChildSelected = async (child: Profile) => {
    await loginAsChild(child.id);
  };

  // Handler for parent authentication
  const handleParentAuth = async () => {
    await loginAsParent();
  };

  // Setup automatic refresh at midnight (Taiwan time)
  useEffect(() => {
    const scheduleMiddnightRefresh = () => {
      // Get current time in Taiwan timezone
      const nowInTaiwan = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));

      // Calculate next midnight in Taiwan
      const nextMidnight = new Date(nowInTaiwan);
      nextMidnight.setHours(24, 0, 0, 0); // Set to next day at 00:00:00

      const msUntilMidnight = nextMidnight.getTime() - nowInTaiwan.getTime();

      console.log(`⏰ Scheduling midnight refresh in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);

      const timer = setTimeout(() => {
        console.log('🔄 Midnight refresh triggered - invalidating queries');
        queryClient.invalidateQueries({ queryKey: ['daily_logs'] });
        queryClient.invalidateQueries({ queryKey: ['quests'] });
        queryClient.invalidateQueries({ queryKey: ['total_points'] });

        // Schedule next refresh
        scheduleMiddnightRefresh();
      }, msUntilMidnight);

      return timer;
    };

    const timer = scheduleMiddnightRefresh();
    return () => {
      console.log('⏹️ Clearing midnight refresh timer');
      clearTimeout(timer);
    };
  }, []); // Remove queryClient dependency as it's stable

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

  // 3. Authenticated and Role Selected -> Show Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-pokeball-red to-pink-100 py-8 px-4">
      {/* Header / Logout Area */}
      <div className="max-w-6xl mx-auto mb-4 flex justify-between items-center bg-white/80 p-2 rounded-lg border-2 border-deep-black shadow-md sticky top-2 z-50">
        <div className="font-pixel text-sm flex items-center gap-2">
          {/* Header Text Logic */}
          {user.role === 'parent' ? (
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <span className="font-bold">{user.name}</span>
              <span className="text-gray-500 text-xs">(家長)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xl">{user.avatar_url || '👦'}</span>
              <span className="font-bold">{user.name}</span>
              <span className="text-gray-500 text-xs">(小小冒險家)</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {user.role === 'parent' && (
            <button
              onClick={lockParent}
              className="flex items-center gap-2 px-3 py-1 bg-yellow-100 border-2 border-deep-black hover:bg-yellow-200 transition-colors font-pixel text-xs"
              title="登出家長 (需要重新輸入PIN)"
            >
              <Lock size={14} />
              <span>登出家長</span>
            </button>
          )}

          {/* Exit Profile (Back to Role Selection) */}
          <button
            onClick={exitProfile}
            className="flex items-center gap-2 px-3 py-1 bg-white border-2 border-deep-black hover:bg-gray-100 transition-colors font-pixel text-xs"
            title={user.role === 'parent' ? '保持登入並切換' : '切換角色'}
          >
            <ArrowLeft size={14} />
            <span>{user.role === 'parent' ? '保持登入' : '切換角色'}</span>
          </button>

          {/* Logout (Sign out from Family) */}
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-3 py-1 bg-red-100 border-2 border-deep-black hover:bg-red-200 transition-colors font-pixel text-xs text-red-600"
            title="登出系統"
          >
            <LogOut size={14} />
            <span>登出系統</span>
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

      {/* Global Home Button - visible when user is logged in */}
      <HomeButton onClick={exitProfile} show={true} />
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
