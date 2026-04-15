import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Settings as SettingsIcon, User, Building, Database, 
  DownloadCloud, UploadCloud, AlertOctagon, Save, ShieldCheck, Mail, Lock, Key
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

  // State untuk Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'system' | 'database'>('profile');

  // State untuk Pengaturan Sistem
  const [companyName, setCompanyName] = useState('PT BUMN Indonesia (Persero)');
  const [auditYear, setAuditYear] = useState(new Date().getFullYear().toString());

  // State untuk Update Profil & Password
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Load pengaturan sistem dari localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('gcg_system_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.auditYear) setAuditYear(parsed.auditYear);
      } catch (e) { console.error(e); }
    }
    
    // Set ulang state jika user data belum ter-load sempurna di awal
    if (user && !editName) {
      setEditName(user.name);
      setEditEmail(user.email);
    }
  }, [user]);

  // ==========================================
  // LOGIKA UPDATE PROFIL & PASSWORD (API DATABASE)
  // ==========================================

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const token = localStorage.getItem('gcg_token');
      
      // Update via API (Menggunakan endpoint User Management)
      const res = await fetch(`${API_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          // WAJIB KIRIM DATA INI BIAR GAK KERESET DI CONTROLLER
          role: user.role, 
          level: user.level || null,
          divisi: user.divisi || null
        })
      });

      if (res.ok) {
        // Update local data auth agar nama di Header/Sidebar langsung berubah
        const loggedInUser = JSON.parse(localStorage.getItem('gcg_logged_in_user') || '{}');
        localStorage.setItem('gcg_logged_in_user', JSON.stringify({ ...loggedInUser, name: editName, email: editEmail }));

        alert('Profil berhasil diperbarui di Database! Halaman akan dimuat ulang untuk mensinkronkan data.');
        window.location.reload();
      } else {
        const data = await res.json();
        alert(`Gagal: ${data.message || 'Periksa kembali data inputan Anda.'}`);
      }
    } catch (error) {
      alert('Terjadi kesalahan jaringan saat menyimpan profil.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword !== confirmPassword) {
      return alert('Password Baru dan Konfirmasi Password tidak cocok!');
    }

    try {
      const token = localStorage.getItem('gcg_token');

      // 1. Coba gunakan route khusus /change-password dari AuthController
      const res = await fetch(`${API_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          new_password_confirmation: confirmPassword
        })
      });

      if (res.ok) {
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        alert('Password berhasil diubah! Gunakan password baru untuk login selanjutnya.');
      } else {
        // 2. Fallback: Jika endpoint /change-password gagal
        const resFallback = await fetch(`${API_URL}/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            password: newPassword,
            name: user.name, 
            email: user.email,
            // WAJIB KIRIM DATA INI BIAR GAK KERESET
            role: user.role,
            level: user.level || null,
            divisi: user.divisi || null
          })
        });

        if (resFallback.ok) {
          setOldPassword(''); setNewPassword(''); setConfirmPassword('');
          alert('Password berhasil diubah (via sinkronisasi User Management)!');
        } else {
           const errData = await resFallback.json();
           alert(`Gagal merubah password: ${errData.message || 'Password lama mungkin salah.'}`);
        }
      }
    } catch (error) {
      alert('Terjadi kesalahan jaringan saat memperbarui password.');
    }
  };


  // ==========================================
  // LOGIKA MANAJEMEN DATABASE & SISTEM
  // ==========================================

  const handleSaveSystemSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const settings = { companyName, auditYear };
    localStorage.setItem('gcg_system_settings', JSON.stringify(settings));
    alert('Pengaturan sistem berhasil disimpan!');
  };
  
  const dbKeys = [
    'gcg_users', 
    'masterIndicators', 
    'assessments', 
    'gcg_tl_records', 
    'gcg_evidences', 
    'gcg_document_requests',
    'gcg_system_settings'
  ];

  const handleExportDatabase = () => {
    if (!window.confirm('Download backup database lokal sekarang?')) return;
    
    const backupData: Record<string, string | null> = {};
    dbKeys.forEach(key => {
      backupData[key] = localStorage.getItem(key);
    });

    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup_GCG_Pro_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.confirm('PERINGATAN BAHAYA!\n\nProses ini akan MENIMPA (Overwrite) seluruh data lokal dengan data dari file backup.\n\nApakah Anda yakin ingin melanjutkan?')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target?.result as string);
          
          Object.keys(importedData).forEach(key => {
            if (importedData[key]) {
              localStorage.setItem(key, importedData[key]);
            } else {
              localStorage.removeItem(key);
            }
          });

          alert('Restore Database Berhasil! Aplikasi akan dimuat ulang.');
          window.location.reload();
        } catch (error) {
          alert('Format file backup tidak valid atau rusak!');
        }
      };
      reader.readAsText(file);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFactoryReset = () => {
    if (window.confirm('🚨 PERINGATAN SUPER BAHAYA! 🚨\n\nIni akan menghapus SELURUH cache lokal secara PERMANEN!\n(Akun pengguna di database MySQL aman).\n\nKetik "RESET" di prompt selanjutnya jika Anda yakin.')) {
      const confirmText = window.prompt('Ketik "RESET" untuk mengkonfirmasi penghapusan permanen:');
      if (confirmText === 'RESET') {
        const keysToKeep = ['gcg_users', 'gcg_system_settings', 'gcg_logged_in_user', 'gcg_token']; 
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && !keysToKeep.includes(key) && key.startsWith('gcg_') || key === 'assessments' || key === 'masterIndicators') {
            localStorage.removeItem(key);
          }
        }
        
        alert('Reset Cache berhasil! Aplikasi kembali bersih.');
        window.location.reload();
      } else {
        alert('Reset dibatalkan.');
      }
    }
  };

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin_spi';

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500 text-left w-full min-w-0 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
        <div className="flex items-center space-x-5 relative z-10">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 text-white shrink-0">
            <SettingsIcon className="w-8 h-8" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">Pengaturan Sistematik</h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">Konfigurasi Hak Akses, Profil, dan Backup Data</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* SIDEBAR TABS */}
        <div className="w-full lg:w-72 shrink-0 space-y-3">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center justify-between px-6 py-4.5 rounded-2xl font-black text-sm transition-all overflow-hidden relative group ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 border border-indigo-700' : 'bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-100 shadow-sm'}`}
          >
             <div className="flex items-center gap-3 relative z-10"><User size={18} strokeWidth={2.5}/> Profil Saya</div>
             {activeTab === 'profile' && <div className="absolute inset-0 bg-white/10 w-full h-full translate-x-12 skew-x-12 scale-150"></div>}
          </button>

          {isAdmin && (
            <>
              <button 
                onClick={() => setActiveTab('system')}
                className={`w-full flex items-center justify-between px-6 py-4.5 rounded-2xl font-black text-sm transition-all overflow-hidden relative group ${activeTab === 'system' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 border border-indigo-700' : 'bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-100 shadow-sm'}`}
              >
                <div className="flex items-center gap-3 relative z-10"><Building size={18} strokeWidth={2.5}/> Profil Instansi</div>
                {activeTab === 'system' && <div className="absolute inset-0 bg-white/10 w-full h-full translate-x-12 skew-x-12 scale-150"></div>}
              </button>
              
              <button 
                onClick={() => setActiveTab('database')}
                className={`w-full flex items-center justify-between px-6 py-4.5 rounded-2xl font-black text-sm transition-all overflow-hidden relative group ${activeTab === 'database' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 border border-indigo-700' : 'bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-100 shadow-sm'}`}
              >
                <div className="flex items-center gap-3 relative z-10"><Database size={18} strokeWidth={2.5}/> Manajemen Lokal</div>
                {activeTab === 'database' && <div className="absolute inset-0 bg-white/10 w-full h-full translate-x-12 skew-x-12 scale-150"></div>}
              </button>
            </>
          )}
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 w-full min-w-0">
          
          {/* TAB: PROFIL SAYA */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full min-w-0">
              
              {/* KARTU IDENTITAS */}
              <div className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-60"></div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight mb-8 flex items-center gap-3 border-b border-slate-100 pb-5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><User size={20} strokeWidth={2.5}/></div> Informasi Dasar Pengguna
                </h2>
                
                <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                  <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-5xl shadow-xl shadow-indigo-200 shrink-0 border-4 border-white">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="space-y-5 flex-1 w-full">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nama Lengkap</p>
                      <p className="text-xl font-black text-slate-800 leading-none">{user?.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email Corporate</p>
                      <p className="text-sm font-bold text-slate-600 flex items-center gap-2"><Mail size={16} className="text-slate-400"/> {user?.email}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Role Sistem</p>
                        <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-black text-[10px] uppercase tracking-widest rounded-lg border border-indigo-100/50 flex items-center gap-1.5 w-max">
                          <ShieldCheck size={14} strokeWidth={2.5}/> {user?.role.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Spesifikasi / Divisi</p>
                        <p className="text-sm font-bold text-slate-700">{user?.level || user?.divisi || 'Administrator'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FORM UPDATE PROFIL & PASSWORD */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                
                {/* UBAH PROFIL */}
                <div className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 p-8">
                  <h3 className="text-md font-black text-slate-800 uppercase tracking-tight mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                    <User size={18} className="text-indigo-500" strokeWidth={2.5}/> Update Profil
                  </h3>
                  <form onSubmit={handleUpdateProfile} className="space-y-5">
                    <div className="group">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Nama Lengkap</label>
                      <input 
                        required type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none text-slate-700 text-sm transition-all" 
                      />
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Email</label>
                      <input 
                        required type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none text-slate-700 text-sm transition-all" 
                      />
                    </div>
                    <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-800/20 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 mt-2">
                      <Save size={16} strokeWidth={2.5}/> Simpan Profil ke API
                    </button>
                  </form>
                </div>

                {/* GANTI PASSWORD */}
                <div className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 p-8">
                  <h3 className="text-md font-black text-slate-800 uppercase tracking-tight mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                    <Key size={18} className="text-amber-500" strokeWidth={2.5}/> Pengaturan Akses
                  </h3>
                  <form onSubmit={handleChangePassword} className="space-y-5">
                    <div className="group">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-amber-600 transition-colors">Kata Sandi Lama</label>
                      <input 
                        required type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none text-slate-700 text-sm transition-all" 
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-amber-600 transition-colors">Sandi Baru</label>
                        <input 
                          required type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none text-slate-700 text-sm transition-all" 
                        />
                      </div>
                      <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-amber-600 transition-colors">Ulangi Sandi</label>
                        <input 
                          required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none text-slate-700 text-sm transition-all" 
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-amber-500/30 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 mt-2">
                      <Lock size={16} strokeWidth={2.5}/> Terapkan Akses Sandi
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )}

          {/* TAB: PENGATURAN SISTEM */}
          {activeTab === 'system' && isAdmin && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 animate-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-black text-slate-800 tracking-tight mb-8 flex items-center gap-3 border-b border-slate-100 pb-5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Building size={20} strokeWidth={2.5}/></div> Metadata Instansi
              </h2>

              <form onSubmit={handleSaveSystemSettings} className="space-y-6 max-w-2xl">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Nama Entitas Bisnis / BUMN</label>
                  <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none text-slate-800 transition-all text-md" 
                  />
                  <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1.5"><AlertOctagon size={12}/> Penamaan publik di Kertas Kerja Laporan</p>
                </div>

                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Tahun Buku Berlangsung</label>
                  <input 
                    type="number" 
                    value={auditYear}
                    onChange={(e) => setAuditYear(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none text-slate-800 transition-all text-md" 
                  />
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/30 active:scale-95 flex items-center gap-2">
                    <Save size={16} strokeWidth={2.5}/> Terapkan Perubahan Global
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: MANAJEMEN DATABASE LOKAL (Sisa Prototype) */}
          {activeTab === 'database' && isAdmin && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              
              {/* BACKUP & RESTORE */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                <h2 className="text-xl font-black text-slate-800 tracking-tight mb-3 flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Database size={20} strokeWidth={2.5}/></div> Memori Lokal (Cache)
                </h2>
                <p className="text-sm font-semibold text-slate-500 mb-8 border-b border-slate-100 pb-5">Pusat data offline yang menetap di browser. Tidak mempengaruhi inti Server MySQL.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* EXPORT */}
                  <div className="p-8 bg-indigo-50 border border-indigo-100/50 rounded-3xl flex flex-col items-center text-center hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/40 rounded-full blur-3xl pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="p-5 bg-white rounded-2xl text-indigo-600 shadow-sm mb-6 relative z-10"><DownloadCloud size={32} strokeWidth={2}/></div>
                    <h3 className="font-black text-indigo-900 mb-2 relative z-10 text-lg">Ekspor Struktur Lokal</h3>
                    <p className="text-xs text-indigo-700/80 mb-8 flex-1 font-semibold relative z-10">Unduh master data & konfigurasi lokal dalam format enkapsulasi JSON yang aman.</p>
                    <button onClick={handleExportDatabase} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all active:scale-95 text-[10px] uppercase tracking-widest relative z-10">
                      Generate JSON Output
                    </button>
                  </div>

                  {/* IMPORT */}
                  <div className="p-8 bg-slate-50 border border-slate-100 rounded-3xl flex flex-col items-center text-center hover:shadow-lg transition-all duration-300 group">
                    <div className="p-5 bg-white rounded-2xl text-slate-600 shadow-sm mb-6"><UploadCloud size={32} strokeWidth={2}/></div>
                    <h3 className="font-black text-slate-800 mb-2 text-lg">Impor Struktur JSON</h3>
                    <p className="text-xs text-slate-500 mb-8 flex-1 font-semibold">Memulihkan memori lokal lewat unggahan manifest. (Data lama otomatis terganti!)</p>
                    
                    <label className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-800/30 active:scale-95 transition-all text-[10px] uppercase tracking-widest cursor-pointer block">
                      Unggah File Manifest.json
                      <input 
                        type="file" 
                        accept=".json" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleImportDatabase} 
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* DANGER ZONE */}
              <div className="bg-rose-50 border border-rose-200/60 rounded-3xl shadow-sm p-8 relative overflow-hidden">
                <div className="absolute left-0 top-0 w-2 h-full bg-rose-500"></div>
                <h2 className="text-xl font-black text-rose-800 tracking-tight mb-2 flex items-center gap-3">
                  <AlertOctagon className="text-rose-600" strokeWidth={2.5}/> Operasi Destruktif
                </h2>
                <p className="text-sm font-semibold text-rose-600/80 mb-8 border-b border-rose-200/50 pb-5">Pilihan tingkat akhir yang tak dapat dipulihkan. Lakukan dengan bijaksana.</p>
                
                <div className="flex flex-col md:flex-row items-center justify-between bg-white rounded-2xl p-6 border border-rose-100 shadow-sm">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">Wiping Cached Storages</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Mengosongkan serpihan memori sisa yang membebani browser lokal.</p>
                  </div>
                  <button onClick={handleFactoryReset} className="mt-5 md:mt-0 whitespace-nowrap px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl active:scale-95 transition-all text-[10px] uppercase tracking-widest shadow-xl shadow-rose-600/30">
                    Eksekusi Wipe Out
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

    </div>
  );
}