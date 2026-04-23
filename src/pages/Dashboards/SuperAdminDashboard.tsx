import { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { Users, ShieldAlert, Database, Server, Activity, UserCheck, Lock, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  is_locked?: boolean;
}

export default function SuperAdminDashboard() {
  const [usersList, setUsersList] = useState<UserData[]>([]);
  
  // State untuk loading proses tanpa menghilangkan kerangka
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const fetchSystemData = async () => {
      setIsSyncing(true); // Mulai proses sinkronisasi
      try {
        // Ambil data user untuk statistik
        const resUsers = await fetchApi('/users', {});
        
        if (resUsers.ok) {
          const data = await resUsers.json();
          setUsersList(data);
        }
      } catch (error) {
        console.error("Gagal load data Super Admin Dashboard", error);
      } finally {
        // Kasih delay dikit biar animasi inline loadingnya kerasa smooth
        setTimeout(() => setIsSyncing(false), 500);
      }
    };

    fetchSystemData();
  }, []);

  // Kalkulasi Statistik (Akan default 0 saat pertama kali render)
  const totalUsers = usersList.length;
  const lockedUsers = usersList.filter(u => u.is_locked).length;
  const auditorCount = usersList.filter(u => u.role === 'auditor').length;
  const auditeeCount = usersList.filter(u => u.role === 'auditee').length;

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500 w-full min-w-0 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-20">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl shadow-md shadow-indigo-200">
            <Server className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">System Monitor</h1>
              {/* LOADING INDICATOR: Muncul di sebelah judul biar desain gak hilang */}
              {isSyncing && (
                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full animate-in fade-in zoom-in duration-300">
                  <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" />
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Memuat...</span>
                </div>
              )}
            </div>
            <p className="text-slate-500 font-medium text-sm mt-0.5">Welcome back, Administrator IT</p>
          </div>
        </div>
      </div>

      {/* BUNGKUS KONTEN (Transparan sedikit saat loading, tapi kerangka tetap ada) */}
      <div className={`transition-opacity duration-500 mt-2 ${isSyncing ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        
        {/* CARDS STATISTIK */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col relative overflow-hidden group hover:border-blue-300 hover:shadow-md transition-all duration-300">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors"></div>
            <div className="flex items-center justify-between mb-3 z-10">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100"><Users size={20} /></div>
              <span className="text-3xl font-black text-slate-800 tracking-tight leading-none">{totalUsers}</span>
            </div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest z-10 mb-1">Total Pengguna</h3>
            <p className="text-xs text-slate-500 font-medium z-10">Seluruh akun terdaftar di sistem.</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col relative overflow-hidden group hover:border-emerald-300 hover:shadow-md transition-all duration-300">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-colors"></div>
            <div className="flex items-center justify-between mb-3 z-10">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100"><UserCheck size={20} /></div>
              <span className="text-3xl font-black text-slate-800 tracking-tight leading-none">{auditorCount}</span>
            </div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest z-10 mb-1">Auditor Aktif</h3>
            <p className="text-xs text-slate-500 font-medium z-10">Tim penilai / assesor GCG.</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col relative overflow-hidden group hover:border-indigo-300 hover:shadow-md transition-all duration-300">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors"></div>
            <div className="flex items-center justify-between mb-3 z-10">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100"><Database size={20} /></div>
              <span className="text-3xl font-black text-slate-800 tracking-tight leading-none">{auditeeCount}</span>
            </div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest z-10 mb-1">Divisi Auditee</h3>
            <p className="text-xs text-slate-500 font-medium z-10">Divisi yang dinilai performanya.</p>
          </div>

          <div className={`bg-white rounded-2xl p-5 shadow-sm border ${lockedUsers > 0 ? 'border-red-200' : 'border-slate-200'} flex flex-col relative overflow-hidden group hover:shadow-md transition-all duration-300`}>
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-2xl transition-colors ${lockedUsers > 0 ? 'bg-red-50 group-hover:bg-red-100' : 'bg-slate-50 group-hover:bg-slate-100'}`}></div>
            <div className="flex items-center justify-between mb-3 z-10">
              <div className={`p-2.5 rounded-xl border ${lockedUsers > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                {lockedUsers > 0 ? <ShieldAlert size={20} /> : <Lock size={20} />}
              </div>
              <span className={`text-3xl font-black tracking-tight leading-none ${lockedUsers > 0 ? 'text-red-600' : 'text-slate-800'}`}>{lockedUsers}</span>
            </div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest z-10 mb-1">Akun Terkunci</h3>
            <p className="text-xs text-slate-500 font-medium z-10">Gagal login melebihi batas wajar.</p>
          </div>

        </div>

        {/* SYSTEM HEALTH INFO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
          
          {/* Panel Server Gelap */}
          <div className="bg-slate-900 rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden text-white border border-slate-800 flex flex-col justify-center">
            <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full"></div>
            <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-violet-500/20 blur-3xl rounded-full"></div>
            
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2.5 relative z-10 text-slate-200">
              <Activity size={16} className="text-indigo-400"/> Status Server & API
            </h3>
            
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Database Connection</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-2 bg-emerald-400/10 px-3 py-1 rounded-lg border border-emerald-400/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></span> 
                  Connected
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Storage Folder Link</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-2 bg-emerald-400/10 px-3 py-1 rounded-lg border border-emerald-400/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></span> 
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Environment</span>
                <span className="text-xs font-black text-indigo-300 px-3 py-1 bg-indigo-500/20 rounded-lg border border-indigo-500/30 uppercase tracking-widest">
                  Production
                </span>
              </div>
            </div>
          </div>
          
          {/* Panel Keamanan */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 relative overflow-hidden flex flex-col justify-center">
             <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
              {lockedUsers > 0 ? (
                <><AlertTriangle size={16} className="text-red-500"/> Tindakan Diperlukan</>
              ) : (
                <><CheckCircle2 size={16} className="text-emerald-500"/> Sistem Aman</>
              )}
            </h3>
            
            <div className="relative z-10 h-full">
              {lockedUsers > 0 ? (
                <div className="h-full bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 rounded-xl p-6 flex flex-col justify-center text-center sm:text-left">
                  <p className="text-sm font-black text-red-800 mb-2 uppercase tracking-wide">Ada {lockedUsers} akun yang terkunci!</p>
                  <p className="text-xs font-medium text-red-600/90 leading-relaxed">
                    Sistem mendeteksi percobaan login gagal berturut-turut. Silakan menuju menu <span className="font-bold text-red-700">User Management</span> untuk memverifikasi dan membuka gembok akun tersebut jika diperlukan.
                  </p>
                </div>
              ) : (
                <div className="h-full bg-slate-50 border border-slate-100 rounded-xl p-6 flex flex-col justify-center items-center text-center">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <ShieldAlert size={24} />
                  </div>
                  <p className="text-sm font-black text-slate-700 mb-1 uppercase tracking-wide">Semua sistem berjalan normal</p>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    Tidak ada anomali, akun terkunci, atau peringatan keamanan saat ini.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}