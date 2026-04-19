import { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { Activity, Search, ShieldAlert, CheckCircle2, XCircle, LogOut, Edit, Trash2, PlusCircle } from 'lucide-react';
import { Activity, Search, ShieldAlert, CheckCircle2, XCircle, LogOut, Edit, Trash2, PlusCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Download, Calendar, X } from 'lucide-react'; // 🆕 Import New Icons

export default function ActivityLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  // 🆕 Tambahan state untuk fitur Export
  const [showExportModal, setShowExportModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetchApi('/audit-logs', {
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

  // 🆕 Hilangkan admin_spi
  if (user?.role !== 'super_admin') {
    return (
      <div className="p-10 text-center flex flex-col items-center justify-center">
        <ShieldAlert className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500">Hanya Administrator Utama yang dapat melihat log sistem.</p>
      </div>
    );
  }

  // 🆕 Logic Export
  const handlePreset = (preset: string) => {
    setActivePreset(preset);
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start = '';

    if (preset === 'hari_ini') {
      start = end;
    } else if (preset === '7_hari') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      start = d.toISOString().split('T')[0];
    } else if (preset === 'bulan_ini') {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    } else if (preset === 'semua') {
      start = ''; // Kosongkan untuk ignore filter start date
      setEndDate('');
    }
    
    setStartDate(start);
    if (preset !== 'semua') setEndDate(end);
  };

  const executeExportCSV = () => {
    let filteredToExport = [...logs];
    
    if (startDate || endDate) {
      filteredToExport = filteredToExport.filter(log => {
        const logDate = new Date(log.created_at).toISOString().split('T')[0];
        if (startDate && endDate) return logDate >= startDate && logDate <= endDate;
        if (startDate) return logDate >= startDate;
        if (endDate) return logDate <= endDate;
        return true;
      });
    }

    if (filteredToExport.length === 0) {
      alert("Tidak ada data untuk direntang tanggal tersebut.");
      return;
    }

    const headers = ["Waktu,Pengguna,Role,Aktivitas,Modul,ID Modul,Status/Tindakan,IP Address,Browser"];
    const csvRows = filteredToExport.map(log => {
      const date = new Date(log.created_at).toLocaleString('id-ID');
      const isAnonymous = !log.user;
      const userName = isAnonymous ? "Unauthenticated" : log.user.name;
      const role = isAnonymous ? "-" : log.user.role.replace('_', ' ');
      const attemptedEmail = log.action === 'login_gagal' && log.new_values ? JSON.parse(log.new_values).email_attempt : '';
      const actionRaw = log.action || '';
      
      let humanAction = actionRaw;
      if(actionRaw === 'login_sukses') humanAction = 'Login Berhasil';
      if(actionRaw === 'login_gagal') humanAction = `Login Gagal (${attemptedEmail})`;
      
      const module = log.model_type ? log.model_type.split('\\').pop() : '-';
      const mId = log.model_id || '-';
      const ip = log.ip_address || '-';
      const ua = (log.user_agent || '-').replace(/,/g, ';'); // Escape commas for CSV
      
      return `"${date}","${userName}","${role}","${actionRaw}","${module}","${mId}","${humanAction}","${ip}","${ua}"`;
    });

    const csvContent = headers.concat(csvRows).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `Audit_Log_${startDate || 'Awal'}_to_${endDate || 'Akhir'}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShowExportModal(false);
  };


  return (
    <div className="space-y-6 pb-10 text-left animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <Activity className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Audit Trail</h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">Pantau seluruh aktivitas pengguna dan perubahan sistem.</p>
          </div>
        </div>
        <button onClick={() => setShowExportModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/30 active:scale-95">
          <Download size={16} strokeWidth={3} /> Export Log
        </button>
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

      {/* MODAL EXPORT CANGGIH */}
      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl border border-slate-100 p-6 sm:p-8 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                  <Download size={20} strokeWidth={3}/>
                </div>
                Unduh Log Aktivitas
              </h2>
              <button onClick={() => setShowExportModal(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
                <X size={20} strokeWidth={2.5}/>
              </button>
            </div>

            <div className="space-y-6">
              {/* TOMBOL CEPAT (PRESETS) */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pilih Rentang Otomatis</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <button type="button" onClick={() => handlePreset('hari_ini')} className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${activePreset === 'hari_ini' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>Hari Ini</button>
                  <button type="button" onClick={() => handlePreset('7_hari')} className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${activePreset === '7_hari' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>7 Hari Terakhir</button>
                  <button type="button" onClick={() => handlePreset('bulan_ini')} className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${activePreset === 'bulan_ini' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>Bulan Ini</button>
                  <button type="button" onClick={() => handlePreset('semua')} className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${activePreset === 'semua' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>Semua Waktu</button>
                </div>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink-0 mx-4 text-slate-300 text-xs font-bold uppercase tracking-widest">ATAU</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              {/* kalender MANUAL (CUSTOM DATE) */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tentukan Tanggal Manual</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="group">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-2"> <Calendar size={14} className="text-indigo-400"/> Mulai Tanggal</label>
                    <input type="date" value={startDate} onChange={(e) => {setStartDate(e.target.value); setActivePreset(null);}} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-slate-700 text-sm cursor-pointer"/>
                  </div>
                  <div className="group">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-2"> <Calendar size={14} className="text-indigo-400"/> Sampai Tanggal</label>
                    <input type="date" value={endDate} onChange={(e) => {setEndDate(e.target.value); setActivePreset(null);}} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-slate-700 text-sm cursor-pointer"/>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTON */}
              <div className="pt-6">
                <button type="button" onClick={executeExportCSV} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black py-4 rounded-xl uppercase tracking-widest text-sm transition-transform active:scale-95 shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2">
                  <Download size={18} strokeWidth={3}/> UNDUH EXCEL (.CSV)
                </button>
                <p className="text-center text-[10px] text-slate-400 font-bold mt-3">Format berjenis CSV: Data dapat dibuka dan difilter pada Microsoft Excel dengan mudah.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}