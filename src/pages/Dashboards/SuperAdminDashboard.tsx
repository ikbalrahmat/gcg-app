import { useState, useEffect } from 'react';

import { fetchApi } from '../../utils/api';
import { Users, ShieldAlert, Database, Server, Activity, UserCheck, Lock } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  is_locked?: boolean;
}

export default function SuperAdminDashboard() {
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        // Ambil data user untuk statistik
        const resUsers = await fetchApi('/users', {
          });
        
        if (resUsers.ok) {
          const data = await resUsers.json();
          setUsersList(data);
        }
      } catch (error) {
        console.error("Gagal load data Super Admin Dashboard", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSystemData();
  }, []);

  // Kalkulasi Statistik
  const totalUsers = usersList.length;
  const lockedUsers = usersList.filter(u => u.is_locked).length;
  const auditorCount = usersList.filter(u => u.role === 'auditor').length;
  const auditeeCount = usersList.filter(u => u.role === 'auditee').length;

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500 w-full min-w-0">
      
      {/* HEADER */}
      <div className="flex items-center space-x-4 mb-8">
        <div className="p-3 bg-slate-900 rounded-xl shadow-lg shadow-slate-200">
          <Server className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">System Monitor</h1>
          <p className="text-slate-500 font-medium text-sm">Welcome back, Administrator IT</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Activity className="animate-pulse text-slate-400 w-10 h-10" /></div>
      ) : (
        <>
          {/* CARDS STATISTIK */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pengguna</p>
                <h3 className="text-2xl font-black text-slate-800">{totalUsers} Akun</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl"><UserCheck size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auditor Aktif</p>
                <h3 className="text-2xl font-black text-slate-800">{auditorCount} Orang</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl"><Database size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Divisi Auditee</p>
                <h3 className="text-2xl font-black text-slate-800">{auditeeCount} Divisi</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className={`p-4 rounded-xl ${lockedUsers > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                {lockedUsers > 0 ? <ShieldAlert size={24} /> : <Lock size={24} />}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akun Terkunci</p>
                <h3 className={`text-2xl font-black ${lockedUsers > 0 ? 'text-red-600' : 'text-slate-800'}`}>{lockedUsers} Akun</h3>
              </div>
            </div>

          </div>

          {/* SYSTEM HEALTH INFO */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-slate-900 rounded-2xl p-8 shadow-xl relative overflow-hidden text-white">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full"></div>
              <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={16} className="text-blue-400"/> Status API Server
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                  <span className="text-xs text-slate-400 font-medium">Database Connection</span>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Connected</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                  <span className="text-xs text-slate-400 font-medium">Storage Folder Link</span>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Active</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                  <span className="text-xs text-slate-400 font-medium">Environment</span>
                  <span className="text-xs font-bold text-blue-400">Production</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-500"/> Tindakan Diperlukan
              </h3>
              {lockedUsers > 0 ? (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-sm font-bold text-red-800">Ada {lockedUsers} akun yang terkunci karena gagal login.</p>
                  <p className="text-xs text-red-600 mt-1">Silakan menuju menu <b>User Management</b> untuk membuka gembok akun tersebut.</p>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                  <p className="text-sm font-bold text-slate-500">Semua sistem berjalan normal.</p>
                  <p className="text-xs text-slate-400 mt-1">Tidak ada anomali atau peringatan keamanan.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}