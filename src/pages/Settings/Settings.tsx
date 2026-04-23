import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  User, Save, ShieldCheck, Mail, Lock, Key
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();

  // State untuk Update Profil & Password
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
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
      // Update via API (Menggunakan endpoint User Management)
      const res = await fetchApi(`/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
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
      // 1. Coba gunakan route khusus /change-password dari AuthController
      const res = await fetchApi('/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
        const resFallback = await fetchApi(`/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
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

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500 text-left w-full min-w-0 max-w-7xl mx-auto">

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
        <div className="flex items-center space-x-5 relative z-10">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 text-white shrink-0">
            <User className="w-8 h-8" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">Pengaturan Akun</h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">Kelola informasi profil dan keamanan akun Anda</p>
          </div>
        </div>
      </div>

      <div className="w-full min-w-0">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full min-w-0">

          {/* KARTU IDENTITAS */}
          <div className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-60"></div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight mb-8 flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><User size={20} strokeWidth={2.5} /></div> Informasi Dasar Pengguna
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
                  <p className="text-sm font-bold text-slate-600 flex items-center gap-2"><Mail size={16} className="text-slate-400" /> {user?.email}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Role Sistem</p>
                    <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-black text-[10px] uppercase tracking-widest rounded-lg border border-indigo-100/50 flex items-center gap-1.5 w-max">
                      <ShieldCheck size={14} strokeWidth={2.5} /> {user?.role ? user.role.replace('_', ' ') : 'USER'}
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
            <div className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 p-8 h-full">
              <h3 className="text-md font-black text-slate-800 uppercase tracking-tight mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                <User size={18} className="text-indigo-500" strokeWidth={2.5} /> Update Profil
              </h3>
              <form onSubmit={handleUpdateProfile} className="space-y-5 h-full flex flex-col justify-between">
                <div>
                  <div className="group mb-5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Nama Lengkap</label>
                    <input
                      required type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none text-slate-700 text-sm transition-all"
                    />
                  </div>
                  <div className="group mb-5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Email</label>
                    <input
                      required type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none text-slate-700 text-sm transition-all"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-800/20 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 mt-2">
                  <Save size={16} strokeWidth={2.5} /> Simpan Profil
                </button>
              </form>
            </div>

            {/* GANTI PASSWORD */}
            <div className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 p-8 h-full">
              <h3 className="text-md font-black text-slate-800 uppercase tracking-tight mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                <Key size={18} className="text-amber-500" strokeWidth={2.5} /> Pengaturan Akses
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-5 h-full flex flex-col justify-between">
                <div>
                  <div className="group mb-5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-amber-600 transition-colors">Kata Sandi Lama</label>
                    <input
                      required type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none text-slate-700 text-sm transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
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
                </div>
                <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-amber-500/30 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 mt-2">
                  <Lock size={16} strokeWidth={2.5} /> Terapkan Akses Sandi
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}