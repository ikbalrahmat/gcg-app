import { useState, useEffect } from 'react';
import { Activity, Search, ShieldAlert, CheckCircle2, XCircle, LogOut, Edit, Trash2, PlusCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ActivityLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

  useEffect(() => {
    const fetchLogs = async () => {
      const token = localStorage.getItem('gcg_token');
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/audit-logs`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setLogs(data);
        }
      } catch (error) {
        console.error('Gagal mengambil audit log:', error);
      }
    };

    fetchLogs();
  }, []);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'login_sukses': return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-bold text-[10px] uppercase border border-emerald-200"><CheckCircle2 size={12}/> Login Berhasil</span>;
      case 'login_gagal': return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded font-bold text-[10px] uppercase border border-red-200"><XCircle size={12}/> Login Gagal</span>;
      case 'logout': return <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-1 rounded font-bold text-[10px] uppercase border border-slate-200"><LogOut size={12}/> Logout</span>;
      case 'created': return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded font-bold text-[10px] uppercase border border-blue-200"><PlusCircle size={12}/> Insert Data</span>;
      case 'updated': return <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded font-bold text-[10px] uppercase border border-orange-200"><Edit size={12}/> Update Data</span>;
      case 'deleted': return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded font-bold text-[10px] uppercase border border-red-200"><Trash2 size={12}/> Delete Data</span>;
      default: return <span className="px-2 py-1 rounded font-bold text-[10px] uppercase bg-slate-100">{action}</span>;
    }
  };

  const filteredLogs = logs.filter(
    l => 
      l.user?.name?.toLowerCase().includes(search.toLowerCase()) || 
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.ip_address?.includes(search)
  );

  if (user?.role !== 'super_admin' && user?.role !== 'admin_spi') {
    return (
      <div className="p-10 text-center flex flex-col items-center justify-center">
        <ShieldAlert className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500">Hanya Administrator yang dapat melihat log sistem.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 text-left animate-in fade-in duration-500">
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-indigo-100 rounded-xl">
          <Activity className="w-8 h-8 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Audit Trail</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">Pantau seluruh aktivitas pengguna dan perubahan sistem.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari user, aktivitas, IP..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-slate-400 text-[10px] font-black uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Pengguna</th>
                <th className="px-6 py-4">Aktivitas</th>
                <th className="px-6 py-4">Target / Modul</th>
                <th className="px-6 py-4">IP Address & Browser</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.map(log => {
                const date = new Date(log.created_at).toLocaleString('id-ID');
                const isAnonymous = !log.user;
                const attemptedEmail = log.action === 'login_gagal' && log.new_values ? JSON.parse(log.new_values).email_attempt : null;

                return (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-500">{date}</td>
                    <td className="px-6 py-4">
                      {isAnonymous ? (
                        <p className="font-bold text-red-600">Unauthenticated</p>
                      ) : (
                        <>
                          <p className="font-bold text-slate-900">{log.user.name}</p>
                          <p className="text-[10px] uppercase font-bold text-indigo-500">{log.user.role.replace('_', ' ')}</p>
                        </>
                      )}
                      {attemptedEmail && <p className="text-xs text-slate-400 mt-1">Mencoba: {attemptedEmail}</p>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getActionBadge(log.action)}</td>
                    <td className="px-6 py-4 text-xs">
                      {log.model_type ? (
                        <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
                          {log.model_type.split('\\').pop()} (ID: {log.model_id})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <p className="font-mono font-bold text-slate-700">{log.ip_address}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[200px]" title={log.user_agent}>{log.user_agent}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}