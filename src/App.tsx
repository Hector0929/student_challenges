import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider, useUser } from './contexts/UserContext';
import { FamilyPasswordGuard } from './pages/FamilyPasswordGuard';
import { RoleSelection } from './pages/RoleSelection';
import { ChildDashboard } from './pages/ChildDashboard';
import { ParentControl } from './pages/ParentControl';
import { ParentApproval } from './pages/ParentApproval';
import { ChildManagement } from './pages/ChildManagement';
import { useRealtimeSubscription } from './hooks/useRealtime';
import { LogOut } from 'lucide-react';
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
  const { user, loginAsChild, loginAsParent, logout, logoutParent } = useUser();

  // Enable global realtime updates
  useRealtimeSubscription(user?.id);

  const [isFamilyAuthenticated, setIsFamilyAuthenticated] = useState(false);
  const [view, setView] = useState<'dashboard' | 'control' | 'children'>('dashboard');

  // Check family authentication on mount
  useEffect(() => {
    const familyAuth = sessionStorage.getItem('family-auth');
    setIsFamilyAuthenticated(familyAuth === 'verified');
  }, []);

  // Handler for family password success
  const handleFamilyAuth = () => {
    setIsFamilyAuthenticated(true);
  };

  // Handler for child selection
  const handleChildSelected = async (child: Profile) => {
    await loginAsChild(child.id);
  };

  // Handler for parent authentication
  const handleParentAuth = async () => {
    await loginAsParent();
  };

  // Handler for logout
  const handleLogout = () => {
    logout();
    // Don't clear family auth - they can still select another role
  };

  // Handler for parent logout
  const handleLogoutParent = () => {
    logoutParent();
  };

  // Render family password guard if not authenticated
  if (!isFamilyAuthenticated) {
    return <FamilyPasswordGuard onAuthenticated={handleFamilyAuth} />;
  }

  // Render role selection if authenticated but no user selected
  if (!user) {
    return (
      <RoleSelection
        onChildSelected={handleChildSelected}
        onParentAuthenticated={handleParentAuth}
      />
    );
  }

  // Render based on user role
  return (
    <div className="min-h-screen bg-gradient-to-b from-pokeball-red to-pink-100 py-8 px-4">
      {/* Logout Button */}
      <div className="max-w-6xl mx-auto mb-4 flex justify-end gap-2">
        {user.role === 'parent' && (
          <button
            onClick={handleLogoutParent}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white border-2 border-deep-black hover:bg-red-600 transition-colors font-pixel text-xs"
            title="登出家長"
          >
            <LogOut size={16} />
            <span>登出家長</span>
          </button>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-deep-black hover:bg-gray-100 transition-colors font-pixel text-xs"
          title="切換角色"
        >
          <LogOut size={16} />
          <span>切換角色</span>
        </button>
      </div>

      {user.role === 'child' ? (
        <ChildDashboard userId={user.id} />
      ) : (
        <>
          {/* Parent View Toggle */}
          <div className="max-w-6xl mx-auto mb-6">
            <div className="flex bg-white border-2 border-deep-black p-1 w-fit">
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
            </div>
          </div>

          {view === 'dashboard' ? (
            <ParentApproval />
          ) : view === 'control' ? (
            <ParentControl />
          ) : (
            <ChildManagement />
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
