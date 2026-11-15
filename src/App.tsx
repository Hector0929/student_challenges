import { useState, useEffect, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider, useUser } from './contexts/UserContext';
import { FamilyOnboarding } from './pages/FamilyOnboarding';
import { RoleSelection } from './pages/RoleSelection';
import { HomeButton } from './components/HomeButton';
import { useRealtimeSubscription } from './hooks/useRealtime';
import { LogOut, ArrowLeft, Lock, LayoutDashboard, Briefcase, Users, Settings, Bug, BookOpen } from 'lucide-react';
import type { Profile } from './types/database';
import { ForcePinSetup } from './components/ForcePinSetup';
import { needsPinSetup } from './lib/pin';
import { ResetPassword } from './pages/ResetPassword';
import { supabase } from './lib/supabase';
import './index.css';

// 各頁面分開打包：孩子端不會下載家長頁，家長端也不會下載 3D 群島與怪獸塔
const ChildDashboard = lazy(() => import('./pages/ChildDashboard').then((m) => ({ default: m.ChildDashboard })));
const ParentControl = lazy(() => import('./pages/ParentControl').then((m) => ({ default: m.ParentControl })));
const ParentApproval = lazy(() => import('./pages/ParentApproval').then((m) => ({ default: m.ParentApproval })));
const ChildManagement = lazy(() => import('./pages/ChildManagement').then((m) => ({ default: m.ChildManagement })));
const ParentSettings = lazy(() => import('./pages/ParentSettings').then((m) => ({ default: m.ParentSettings })));
const ConceptPreview = lazy(() => import('./features/concepts/ConceptPreview').then((m) => ({ default: m.ConceptPreview })));
const DebugPage = lazy(() => import('./pages/DebugPage').then((m) => ({ default: m.DebugPage })));

const PageLoading = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="text-xl font-pixel animate-pulse">Loading...</div>
  </div>
);

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

  // 從「重設密碼」信件連結回來：Supabase 會送出 PASSWORD_RECOVERY，先讓家長設定新密碼
  const [recovering, setRecovering] = useState(() => {
    try {
      return /type=recovery/.test(window.location.hash);
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => subscription.unsubscribe();
  }, []);
  const finishRecovery = () => {
    setRecovering(false);
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      /* 無法改網址就算了 */
    }
  };

  const [view, setView] = useState<'dashboard' | 'control' | 'children' | 'concepts' | 'settings' | 'debug'>('dashboard');
  // Handler for child selection
  // 孩子的主首頁是儀表板；群島從儀表板的入口列進去
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

  // 0. 重設密碼
  if (recovering && session) {
    return <ResetPassword onDone={finishRecovery} />;
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

  // 3. Parent, or child dashboard
  return (
    <div className="min-h-screen py-8 px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #B8E0F6 0%, #E8F4FC 100%)' }}>
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

          {/* 登出整個家庭帳號：只在家長模式出現，孩子的畫面不放 */}
          {user.role === 'parent' && (
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-3 py-1 bg-red-100 border-2 border-deep-black hover:bg-red-200 transition-colors font-pixel text-xs text-red-600"
            title="登出系統"
          >
            <LogOut size={14} />
            <span>登出系統</span>
          </button>
          )}
        </div>
      </div>

      {user.role === 'child' ? (
        <Suspense fallback={<PageLoading />}>
          <ChildDashboard userId={user.id} onGoHome={exitProfile} />
        </Suspense>
      ) : (
        <>
          {/* Parent View Toggle */}
          <div className="max-w-6xl mx-auto mb-6">
            <div className="clay-tab-switch w-full sm:w-fit p-1 flex-wrap">
              <button
                onClick={() => setView('dashboard')}
                className={view === 'dashboard' ? 'active' : ''}
              >
                <LayoutDashboard size={16} />
                孩子進度
              </button>
              <button
                onClick={() => setView('control')}
                className={view === 'control' ? 'active' : ''}
              >
                <Briefcase size={16} />
                任務管理
              </button>
              <button
                onClick={() => setView('children')}
                className={view === 'children' ? 'active' : ''}
              >
                <Users size={16} />
                管理孩子
              </button>
              <button
                onClick={() => setView('concepts')}
                className={view === 'concepts' ? 'active' : ''}
              >
                <BookOpen size={16} />
                題庫預覽
              </button>
              <button
                onClick={() => setView('settings')}
                className={view === 'settings' ? 'active' : ''}
              >
                <Settings size={16} />
                設定
              </button>
              <button
                onClick={() => setView('debug')}
                className={view === 'debug' ? 'active' : ''}
              >
                <Bug size={16} />
                Debug
              </button>
            </div>
          </div>

          {needsPinSetup(user.pin_code) && <ForcePinSetup />}

          <Suspense fallback={<PageLoading />}>
          {view === 'dashboard' ? (
            <ParentApproval />
          ) : view === 'control' ? (
            <ParentControl />
          ) : view === 'children' ? (
            <ChildManagement />
          ) : view === 'concepts' ? (
            <ConceptPreview />
          ) : view === 'settings' ? (
            <ParentSettings />
          ) : (
            <DebugPage />
          )}
          </Suspense>
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
