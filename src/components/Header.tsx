import { useAuth } from '../contexts/AuthContext';
import { Menu } from 'lucide-react';

interface HeaderProps {
  currentPage: string;
  isOpen: boolean;
  isMobile?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export default function Header({ currentPage = 'dashboard', isOpen, isMobile, setIsOpen }: HeaderProps) {
  const { user } = useAuth();

  const fullName = user?.name || 'Pengguna Tidak Dikenal';
  const userInitial = fullName !== 'Pengguna Tidak Dikenal' ? fullName.charAt(0).toUpperCase() : 'U';

  const displayRole = user?.role ? user.role.replace('_', ' ') : 'Pengguna Sistem';

  // Fungsi untuk bikin teks "arsip-dokumen" jadi "Arsip Dokumen"
  const formatTitle = (text: string) => {
    return text
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <header
      className={`bg-white/85 backdrop-blur-2xl border-b border-indigo-100/50 h-[76px] flex items-center justify-between px-6 lg:px-10 fixed top-0 right-0 z-30 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_4px_30px_rgba(0,0,0,0.02)] ${
        isMobile ? 'left-0' : isOpen ? 'left-72' : 'left-24'
      }`}
    >
      <div className="flex items-center gap-4">
        {isMobile && setIsOpen && (
          <button 
            onClick={() => setIsOpen(true)}
            className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight drop-shadow-sm">
          {formatTitle(currentPage)}
        </h2>
      </div>

      {/* Profil User */}
      <div className="group flex items-center gap-4 bg-white py-1.5 px-2 lg:px-3 rounded-full border border-slate-100 shadow-sm shadow-indigo-100/50 hover:shadow-md hover:border-indigo-100 transition-all duration-300 cursor-pointer">
        <div className="text-right hidden sm:block ml-3 pl-1">
          <p className="text-[13px] font-black text-slate-800 leading-none mb-1 group-hover:text-indigo-700 transition-colors">
            {fullName}
          </p>
          <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest leading-none">
            {displayRole} {user?.level ? `- ${user.level}` : user?.divisi ? `- ${user.divisi}` : ''}
          </p>
        </div>

        {/* Avatar dengan Gradient Indigo ke Violet biar senada dengan Logo G-AS */}
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-black text-sm shrink-0 group-hover:scale-105 transition-transform duration-300">
          {userInitial}
        </div>
      </div>
    </header>
  );
}