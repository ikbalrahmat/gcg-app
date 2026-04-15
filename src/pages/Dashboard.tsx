import { useAuth } from '../contexts/AuthContext';

// Import komponen dashboard dari folder Dashboards
import ExecutiveDashboard from './Dashboards/ExecutiveDashboard';
import SuperAdminDashboard from './Dashboards/SuperAdminDashboard';
import AuditorDashboard from './Dashboards/AuditorDashboard';
import AuditeeDashboard from './Dashboards/AuditeeDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  // Kalau data user belum ke-load dari context, tampilkan loading animasi
  if (!user) {
    return (
      <div className="flex items-center justify-center h-full w-full min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // SWITCHER: Tampilkan dashboard yang berbeda sesuai Role
  switch (user.role) {
    case 'super_admin':
      return <SuperAdminDashboard />;
    
    case 'admin_spi':
    case 'manajemen':
      // Admin SPI dan Manajemen melihat Executive Summary (tabel dan grafik YoY)
      return <ExecutiveDashboard />;
    
    case 'auditor':
      // Auditor melihat antrean reviu dan TL
      return <AuditorDashboard />;
    
    case 'auditee':
      // Auditee melihat tagihan dokumen dan revisi
      return <AuditeeDashboard />;
    
    default:
      // Fallback jika role tidak dikenali
      return <ExecutiveDashboard />;
  }
}