import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { ChildDashboard } from './pages/ChildDashboard';
import { ParentControl } from './pages/ParentControl';
import { ParentApproval } from './pages/ParentApproval';
import { UserRegistration } from './pages/UserRegistration';
import { UserProvider, useUser } from './contexts/UserContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const { user, registerUser, logout } = useUser();
  const [currentView, setCurrentView] = useState<'quests' | 'approval'>('quests');

  // Show registration if no user
  if (!user) {
    return <UserRegistration onRegister={registerUser} />;
  }

  // Child view
  if (user.role === 'child') {
    return (
      <Layout
        currentRole="child"
        onRoleChange={() => { }}
        user={user}
        onLogout={logout}
      >
        <ChildDashboard userId={user.id} />
      </Layout>
    );
  }

  // Parent view with tabs
  return (
    <Layout
      currentRole="parent"
      onRoleChange={() => { }}
      user={user}
      onLogout={logout}
    >
      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 border-b-4 border-deep-black">
        <button
          onClick={() => setCurrentView('quests')}
          className={`
            px-6 py-3 font-pixel text-xs border-4 border-deep-black border-b-0
            transition-colors
            ${currentView === 'quests'
              ? 'bg-pokeball-red text-white -mb-1'
              : 'bg-white text-deep-black hover:bg-gray-100'
            }
          `}
        >
          📝 任務管理
        </button>
        <button
          onClick={() => setCurrentView('approval')}
          className={`
            px-6 py-3 font-pixel text-xs border-4 border-deep-black border-b-0
            transition-colors
            ${currentView === 'approval'
              ? 'bg-pokeball-red text-white -mb-1'
              : 'bg-white text-deep-black hover:bg-gray-100'
            }
          `}
        >
          ✅ 審核任務
        </button>
      </div>

      {/* Content */}
      {currentView === 'quests' ? <ParentControl /> : <ParentApproval />}
    </Layout>
  );
};

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
