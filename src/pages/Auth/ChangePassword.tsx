import React, { useState } from 'react';
import { ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react';
import type { User } from '../../types';

interface ChangePasswordProps {
  onSuccess: (updatedUser: User) => void;
}

export default function ChangePassword({ onSuccess }: ChangePasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok!');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('gcg_token');

    try {
      const response = await fetch(`${API_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Gagal memperbarui sandi.');
        setLoading(false);
        return;
      }

      onSuccess(data.user);
    } catch (err) {
      setError('Terjadi kesalahan jaringan. Pastikan server menyala.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 font-sans overflow-hidden bg-slate-900">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-violet-900 to-slate-900 opacity-90"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      
      <div className="w-full max-w-md relative z-10 bg-white rounded-3xl shadow-2xl overflow-hidden border border-indigo-100 animate-fade-in">
        
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-center text-white relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
          <div className="relative z-10">
            <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 backdrop-blur-sm shadow-lg">
              <ShieldAlert size={32} className="text-white drop-shadow-md" />
            </div>
            <h2 className="text-3xl font-black tracking-tight mb-2">Pembaruan Keamanan</h2>
            <p className="text-indigo-100 text-sm font-medium leading-relaxed">
              Anda diwajibkan untuk memperbarui kata sandi Anda demi keamanan akun.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold flex gap-3 items-start animate-fade-in shadow-sm">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-5">
            <div className="group">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Password Baru</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-slate-700 font-semibold bg-slate-50 hover:bg-slate-100 focus:bg-white"
                  placeholder="Minimal 8 karakter"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Konfirmasi Password Baru</label>
              <div className="relative">
                <CheckCircle2 className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-slate-700 font-semibold bg-slate-50 hover:bg-slate-100 focus:bg-white"
                  placeholder="Ulangi password baru"
                />
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 shadow-sm shadow-indigo-100/30">
            <p className="text-[11px] font-black text-indigo-900 uppercase tracking-wider mb-2">Syarat Password:</p>
            <ul className="text-xs text-indigo-700 space-y-1.5 font-medium flex flex-col gap-1">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Minimal 8 karakter</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Huruf besar & kecil (A-z, a-z)</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Kolaborasi angka & simbol</li>
              <li className="flex items-start gap-2 text-rose-600 mt-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1 shrink-0"></div> Tidak boleh sama dengan 3 sandi terakhir</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-70 mt-2"
          >
            {loading ? 'Memproses...' : 'Simpan Password Baru'}
          </button>
        </form>

      </div>
    </div>
  );
}