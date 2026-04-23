import {
  Home,
  FileText,
  BarChart3,
  Monitor,
  Settings,
  LogOut,
  Users,
  ChevronLeft,
  Menu,
  Database,
  Activity,
  Archive,
  X 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobile?: boolean;
}

export default function Sidebar({
  currentPage,
  onNavigate,
  isOpen,
  setIsOpen,
  isMobile,
}: SidebarProps) {
  const { signOut, user } = useAuth();

  const menuGroups = [
    {
      title: '',
      items: [{ id: 'home', label: 'Dashboard', icon: Home }],
    },
    {
      title: 'MENU UTAMA',
      items: [
        ...(user?.role === 'auditor'
          ? [{ id: 'assessment', label: 'Assessment', icon: FileText }]
          : []),

        ...(user?.role === 'auditee'
          ? [{ id: 'file', label: 'Tagihan Dokumen', icon: FileText }]
          : []),

        ...(user?.role === 'auditor' ||
          user?.role === 'admin_spi' ||
          user?.role === 'manajemen' ||
          user?.role === 'auditee'
          ? [{ id: 'monitoring', label: 'Monitoring', icon: Monitor }]
          : []),

        ...(user?.role === 'auditor' ||
          user?.role === 'admin_spi' ||
          user?.role === 'manajemen'
          ? [{ id: 'report', label: 'Report', icon: BarChart3 }]
          : []),

        ...(user?.role === 'auditor' ||
          user?.role === 'admin_spi' ||
          user?.role === 'manajemen'
          ? [{ id: 'arsip-dokumen', label: 'Arsip Dokumen', icon: Archive }]
          : []),
      ],
    },
    {
      title: 'SISTEM',
      items: [
        ...(user?.role === 'super_admin' ||
          user?.role === 'admin_spi'
          ? [{ id: 'user-management', label: 'Manajemen Akun', icon: Users }]
          : []),

        ...(user?.role === 'super_admin' ||
          user?.role === 'admin_spi'
          ? [{ id: 'master-data', label: 'Master Data', icon: Database }]
          : []),

        ...(user?.role === 'super_admin'
          ? [{ id: 'audit-log', label: 'Audit Trail', icon: Activity }]
          : []),

        { id: 'settings', label: 'Pengaturan', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`bg-white border-r border-indigo-100/50 h-screen fixed left-0 top-0 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-50 overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${isMobile ? (isOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full') : (isOpen ? 'w-72' : 'w-24')
          }`}
      >
        {/* HEADER BRANDING */}
        <div className="h-[76px] px-6 lg:px-8 flex items-center shrink-0 border-b border-slate-50 relative group">
          <div
            className={`flex items-center transition-all duration-300 w-full ${(isOpen || isMobile) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 cursor-pointer'
              }`}
            onClick={() => !isOpen && !isMobile && setIsOpen(true)}
          >
            <div className={`flex flex-col justify-center overflow-hidden ${(isOpen || isMobile) ? 'w-auto' : 'w-0'}`}>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-baseline">
                <span className="relative inline-flex flex-col items-start">
                  <span>
                    <span className="text-indigo-600">G</span>
                    <span className="text-slate-800">-</span>
                    <span className="text-slate-800">AS</span>
                  </span>
                  <span className="absolute -bottom-1 left-0 w-6 h-[3px] bg-violet-500 rounded-full"></span>
                </span>
              </h2>
              <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest whitespace-nowrap">
                Governance Assessment System
              </p>
            </div>
          </div>

          {/* PERBAIKAN ICON HAMBURGER: Menghilangkan tabrakan class right-4 dan menggunakan left-1/2 untuk presisi tengah */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`absolute top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-300 active:scale-95 z-10 ${
              isMobile ? 'flex' : 'hidden lg:flex'
            } ${
              (!isOpen && !isMobile) 
                ? 'left-1/2 -translate-x-1/2 bg-slate-50 shadow-sm' 
                : 'right-4 bg-transparent'
            }`}
          >
            {isMobile && isOpen ? (
              <X className="w-5 h-5" />
            ) : isOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* NAVIGATION MENUS */}
        <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {menuGroups.map((group, index) => {
            if (group.items.length === 0) return null;

            return (
              <div key={index} className="space-y-2">
                {group.title && (
                  <h3
                    className={`text-[10px] font-black text-slate-400 tracking-widest uppercase transition-all duration-300 ${
                      isOpen || isMobile ? 'opacity-100 flex px-4' : 'opacity-0 hidden px-0'
                    }`}
                  >
                    {group.title}
                  </h3>
                )}

                <div className="space-y-1.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          if (isMobile) setIsOpen(false);
                        }}
                        title={(!isOpen && !isMobile) ? item.label : undefined}
                        // PERBAIKAN ICON MENU: Menggunakan justify-center dan menghapus px-4 saat sidebar tertutup
                        className={`w-full flex items-center py-3.5 rounded-2xl transition-all duration-200 group ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 transparent border border-transparent'
                        } ${(!isOpen && !isMobile) ? 'justify-center px-0' : 'px-4'}`}
                      >
                        <Icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-sm' : 'group-hover:scale-110'}`} />
                        
                        <span
                          className={`font-bold text-[14px] whitespace-nowrap transition-all duration-300 ${
                            (isOpen || isMobile) ? 'opacity-100 translate-x-0 block ml-4' : 'opacity-0 -translate-x-4 hidden ml-0'
                          }`}
                        >
                          {item.label}
                        </span>

                        {/* Indicator Pill for active item */}
                        {isActive && (isOpen || isMobile) && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* LOGOUT */}
        <div className="p-4 border-t border-slate-50 shrink-0 mt-auto bg-slate-50/50">
          <button
            onClick={signOut}
            title={(!isOpen && !isMobile) ? 'Keluar Sistem' : undefined}
            // PERBAIKAN ICON LOGOUT: Menggunakan justify-center saat tertutup
            className={`w-full flex items-center py-3.5 rounded-2xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all duration-200 border border-transparent ${
              (!isOpen && !isMobile) ? 'justify-center px-0' : 'px-4'
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span
              className={`font-bold text-[14px] transition-all duration-300 ${
                (isOpen || isMobile) ? 'block ml-4' : 'hidden ml-0'
              }`}
            >
              Logout
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}