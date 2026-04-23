import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  User, Save, ShieldCheck, Mail, Lock, Key, Info
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
    <div className="space-y-6 pb-10 animate-in fade-in duration-500 text-left w-full min-w-0 max-w-6xl mx-auto font-sans">

      {/* HEADER SECTION */}
      <div className="flex items-center gap-4 mb-4 border-b border-slate-200/60 pb-5">
        <div className="p-3 bg-indigo-600 rounded-xl shadow-md shadow-indigo-200">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
            Pengaturan Akun
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Kelola informasi profil, akses sistem, dan keamanan akun Anda.
          </p>
        </div>
      </div>

      <div className="w-full min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ======================================================== */}
          {/* CARD KIRI: PROFIL PENGGUNA */}
          {/* ======================================================== */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            
            {/* Identitas Singkat */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-2xl shadow-inner shrink-0 border-2 border-white">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg leading-tight">{user?.name}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Mail size={14} /> {user?.email}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 font-bold text-[10px] uppercase tracking-widest rounded flex items-center gap-1 w-max">
                    <ShieldCheck size={12} /> {user?.role ? user.role.replace('_', ' ') : 'USER'}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    &bull; {user?.level || user?.divisi || 'Administrator'}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Update Profil */}
            <form onSubmit={handleUpdateProfile} className="p-6 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 text-slate-800">
                  <User size={18} className="text-indigo-600" />
                  <h2 className="font-black text-sm uppercase tracking-wider">Perbarui Data</h2>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
                  <input
                    required type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-700 text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Corporate</label>
                  <input
                    required type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-700 text-sm transition-all"
                  />
                </div>
              </div>

              <button type="submit" className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 active:scale-95 shadow-sm">
                <Save size={18} strokeWidth={2} /> Simpan Perubahan Profil
              </button>
            </form>
          </div>

          {/* ======================================================== */}
          {/* CARD KANAN: PENGATURAN PASSWORD */}
          {/* ======================================================== */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            
            {/* Header Password */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Key size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base leading-tight uppercase tracking-tight">Pengaturan Akses</h3>
                <p className="text-xs text-slate-500 mt-1">Perbarui kata sandi untuk mengamankan akun Anda.</p>
              </div>
            </div>

            {/* Form Update Password */}
            <form onSubmit={handleChangePassword} className="p-6 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kata Sandi Lama</label>
                  <input
                    required type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan sandi saat ini"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-slate-700 text-sm transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Sandi Baru</label>
                    <input
                      required type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 8 karakter"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-slate-700 text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Ulangi Sandi Baru</label>
                    <input
                      required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi sandi baru"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-slate-700 text-sm transition-all"
                    />
                  </div>
                </div>

                <div className="mt-4 p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start gap-2.5">
                  <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    Pastikan sandi mengandung kombinasi huruf dan angka. Sesi login Anda mungkin akan diperbarui setelah merubah sandi.
                  </p>
                </div>
              </div>

              <button type="submit" className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 active:scale-95 shadow-sm">
                <Lock size={18} strokeWidth={2} /> Terapkan Akses Sandi
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}