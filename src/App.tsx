import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Auth/Login';
import ForgotPassword from './pages/Auth/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Assessment from './pages/Assessment/Assessment';
import File from './pages/Evidence/File';
import Monitoring from './pages/Monitoring/Monitoring';
import Report from './pages/Laporan/Laporan';
import Settings from './pages/Settings/Settings';
import Layout from './components/Layout';
import UserManagement from './pages/User Managament/UserManagement';
import MasterDataManager from './pages/Settings/MasterDataManager';
import ChangePassword from './pages/Auth/ChangePassword';
import ActivityLog from './pages/Logs/ActivityLog'; // 🆕 IMPORT AUDIT LOG
import type { EvidenceFile, DocumentRequest } from './types';

function App() {
  const { user, loading, signOut } = useAuth();
  
  const [currentPage, setCurrentPage] = useState('home');
  const [authView, setAuthView] = useState<'login' | 'forgot-password'>('login');

  const [evidences, setEvidences] = useState<EvidenceFile[]>(() => {
    const saved = localStorage.getItem('gcg_evidences');
    return saved ? JSON.parse(saved) : [];
  });

  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>(() => {
    const saved = localStorage.getItem('gcg_document_requests');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('gcg_evidences', JSON.stringify(evidences));
  }, [evidences]);

  useEffect(() => {
    localStorage.setItem('gcg_document_requests', JSON.stringify(documentRequests));
  }, [documentRequests]);

  // 🆕 FITUR KEAMANAN NO. 23: AUTO-LOGOUT JIKA IDLE
  useEffect(() => {
    if (!user || user.is_first_login) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      
      const IDLE_TIME = 15 * 60 * 1000; // 15 menit

      timeoutId = setTimeout(() => {
        alert('Sesi Anda telah berakhir karena tidak ada aktivitas (Idle). Silakan masuk kembali.');
        signOut(); 
      }, IDLE_TIME);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];

    resetTimer();

    activityEvents.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user, signOut]); 

  // =========================================================================

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return authView === 'forgot-password' ? (
      <ForgotPassword onBackToLogin={() => setAuthView('login')} />
    ) : (
      <Login onForgotPassword={() => setAuthView('forgot-password')} />
    );
  }

  if (user.is_first_login) {
    return <ChangePassword onSuccess={(updatedUser) => {
      localStorage.setItem('gcg_active_user', JSON.stringify(updatedUser));
      window.location.reload(); 
    }} />;
  }

  const canAccess = (roles: string[]) => roles.includes(user.role);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Dashboard />;

      case 'assessment':
        return canAccess(['auditor'])
          ? <Assessment 
              evidences={evidences} 
              setEvidences={setEvidences} 
              documentRequests={documentRequests} 
              setDocumentRequests={setDocumentRequests} 
            />
          : <Dashboard />;

      case 'file':
        return canAccess(['auditee'])
          ? <File 
              evidences={evidences} 
              setEvidences={setEvidences} 
              documentRequests={documentRequests} 
              setDocumentRequests={setDocumentRequests}
            />
          : <Dashboard />;

      case 'monitoring':
        return canAccess(['auditor', 'admin_spi', 'manajemen', 'auditee'])
          ? <Monitoring />
          : <Dashboard />;

      case 'report':
        return canAccess(['auditor', 'admin_spi', 'manajemen'])
          ? <Report />
          : <Dashboard />;

      case 'user-management':
        return canAccess(['super_admin', 'admin_spi'])
          ? <UserManagement />
          : <Dashboard />;

      case 'master-data':
        return canAccess(['super_admin', 'admin_spi'])
          ? <MasterDataManager />
          : <Dashboard />;

      // 🆕 TAMBAHIN CASE INI BUAT ROUTING AUDIT LOG
      case 'audit-log':
        return canAccess(['super_admin', 'admin_spi'])
          ? <ActivityLog />
          : <Dashboard />;

      case 'settings':
        return <Settings />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;