import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { Users, Plus, Shield, Search, Trash2, Edit, X, Unlock, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { User, UserRole, AuditorLevel } from '../../types';

const MASTER_DIVISIONS = [
  "Satuan Pengawasan Intern",
  "Sekretriat Perusahaan",
  "Perencanaan Strategis dan Portofolio Bisnis",
  "Digital Commercial",
  "Digital Strategy, Planning, and Architecture",
  "Digital Product and Operation",
  "Teknik dan Jaminan Keandalan",
  "Strategic Business Unit (SBU) Currency Solution",
  "Strategic Business Unit (SBU) High Security Solution",
  "Riset dan Pengembangan",
  "Pengadaan dan Fasilitas Umum",
  "Sumber Daya Manusia",
  "Pengamanan, K3 dan Lingkungan",
  "Teknologi Informasi",
  "Keuangan Operasional",
  "Keuangan Strategis",
  "Tata Kelola, Risiko, dan Kepatuhan"
];

export default function UserManagement() {
  const { user } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('auditee');
  const [level, setLevel] = useState<AuditorLevel>('Anggota');
  const [divisi, setDivisi] = useState('');
  const [isCustomDivisi, setIsCustomDivisi] = useState(false);

  

  const fetchUsers = async () => {
    try {
      const response = await fetchApi('/users', {
        });
      const data = await response.json();
      if (response.ok) {
        setUsers(data);
      }
    } catch (error) {
      console.error('Gagal mengambil data user:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize, users]);

  const existingDivisions = MASTER_DIVISIONS;

  const openCreate = () => {
    resetForm();
    setIsEditMode(false);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setIsEditMode(true);
    setEditingId(u.id);
    setName(u.name);
    setEmail(u.email);
    setPassword(''); 
    setRole(u.role);
    setLevel(u.level || 'Anggota');
    
    if (u.role === 'auditee' && u.divisi) {
      setDivisi(u.divisi);
      setIsCustomDivisi(!MASTER_DIVISIONS.includes(u.divisi));
    } else {
      setDivisi('');
      setIsCustomDivisi(false);
    }
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'auditee' && !divisi.trim()) {
      alert("Harap pilih atau masukkan nama Divisi!");
      return;
    }

    setIsSubmitting(true);

    const payload: any = { name, email, role };
    if (role === 'auditor') payload.level = level;
    if (role === 'auditee') payload.divisi = divisi;
    
    if (!isEditMode || password.trim() !== '') {
      payload.password = password;
    }

    const endpoint = isEditMode ? `/users/${editingId}` : `/users`;
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetchApi(endpoint, {
        method: method,
        headers: {
          
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = data.message;
        if (data.errors) {
          errorMsg = Object.values(data.errors).flat().join('\n');
        }
        alert(`Gagal menyimpan data:\n${errorMsg}`);
        return; 
      }

      alert(isEditMode ? 'Data berhasil diubah!' : 'User baru berhasil dibuat!');
      setShowModal(false);
      resetForm();
      fetchUsers(); 
    } catch (error) {
      alert('Terjadi kesalahan jaringan');
    } finally {
      setIsSubmitting(false); 
    }
  };

  const handleDelete = async (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;

    if (target.role === 'super_admin') {
      alert('Super Admin tidak dapat dihapus.');
      return;
    }

    if (window.confirm(`Yakin ingin menghapus pengguna ${target.name}?`)) {
      try {
        const response = await fetchApi(`/users/${id}`, {
          method: 'DELETE',
          });

        if (response.ok) {
          fetchUsers(); 
        } else {
          const data = await response.json();
          alert(`Gagal: ${data.message}`);
        }
      } catch (error) {
        alert('Terjadi kesalahan jaringan saat menghapus');
      }
    }
  };

  const handleUnlock = async (id: string, userName: string) => {
    if (window.confirm(`Buka akses masuk untuk akun ${userName}?`)) {
      try {
        const response = await fetchApi(`/users/${id}/unlock`, {
          method: 'POST',
          });

        const data = await response.json();

        if (response.ok) {
          alert(data.message);
          fetchUsers(); 
        } else {
          alert(`Gagal membuka akun: ${data.message}`);
        }
      } catch (error) {
        alert('Terjadi kesalahan jaringan saat membuka akun');
      }
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole(user?.role === 'super_admin' ? 'admin_spi' : 'auditee');
    setLevel('Anggota');
    setDivisi('');
    setIsCustomDivisi(false);
  };

  const filteredUsers = users.filter(
    u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const startIndex = filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredUsers.length);
  const currentPageUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-8 pb-10 text-left animate-in fade-in duration-500 max-w-7xl mx-auto min-w-0">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
        <div className="flex items-center space-x-5 relative z-10">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 text-white shrink-0">
            <Users className="w-8 h-8" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
              Manajemen Akun
            </h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">
              {user?.role === 'super_admin' ? 'Kelola akses untuk Admin SPI di portal ini.' : 'Kelola otorisasi Auditor, Auditee, dan tingkat Manajemen.'}
            </p>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="relative group bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 text-[11px] sm:w-auto w-full shrink-0 z-10 overflow-hidden active:scale-95"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          <span className="relative z-10 flex items-center gap-2"><Plus size={18} strokeWidth={3} /> Tambah Baru</span>
        </button>
      </div>

      {/* FILTER & TABLE SECTION */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm shadow-slate-200/50 overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-5 border-b border-indigo-50 bg-white relative z-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Cari berdasarkan nama atau email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-slate-100 bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all placeholder:font-normal placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 text-slate-600 text-xs uppercase tracking-[0.18em] font-black">
                <span>Baris</span>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  className="px-3 py-2 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="text-slate-500 text-sm font-semibold">
                Menampilkan {startIndex}-{endIndex} dari {filteredUsers.length}
              </div>
            </div>
          </div>
        </div>

        {/* Table wrapper for mobile */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 whitespace-nowrap">Identitas Pengguna</th>
                <th className="px-6 py-5 whitespace-nowrap">Otoritas (Role)</th>
                <th className="px-6 py-5 whitespace-nowrap">Detail Penugasan</th>
                <th className="px-6 py-5 whitespace-nowrap text-center">Tindakan</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100/80 text-slate-700 bg-white relative z-0">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium pb-20">
                    <div className="flex flex-col items-center justify-center">
                      <UserCheck className="w-16 h-16 text-slate-200 mb-4" strokeWidth={1.5} />
                      <p className="text-lg font-black text-slate-700">Tidak ada pengguna ditemukan</p>
                      <p className="text-sm">Coba gunakan kata kunci berbeda.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentPageUsers.map(u => (
                  <tr key={u.id} className="hover:bg-indigo-50/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-black text-sm shrink-0 shadow-sm">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{u.name}</p>
                          <p className="text-xs text-slate-500 font-medium mt-0.5 group-hover:text-indigo-600 transition-colors">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm shadow-indigo-100/30">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        {u.role === 'auditor' && (
                          <span className="text-violet-700 bg-violet-50 px-3 py-1.5 border border-violet-100/50 rounded-lg text-[10px] uppercase font-black tracking-widest shadow-sm">
                            Level: {u.level || 'Anggota'}
                          </span>
                        )}
                        {u.role === 'auditee' && (
                          <span className="text-emerald-700 bg-emerald-50 px-3 py-1.5 border border-emerald-100/50 rounded-lg text-[10px] uppercase font-black tracking-widest shadow-sm">
                            Divisi: {u.divisi || '-'}
                          </span>
                        )}
                        {u.role !== 'auditor' && u.role !== 'auditee' && (
                          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest px-1">-</span>
                        )}

                        {/* Status Terkunci */}
                        {u.is_locked && (
                          <span className="mt-1 text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm shadow-rose-100/50 flex items-center gap-1.5 animate-pulse">
                            <Shield size={12} strokeWidth={3} /> Terkunci (Gagal 3x)
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        {u.role !== 'super_admin' && (
                          <>
                            <button
                              onClick={() => openEdit(u)}
                              className="p-2.5 text-indigo-500 bg-slate-50 hover:bg-indigo-100 hover:text-indigo-700 rounded-xl transition-all border border-slate-100 hover:border-indigo-200 active:scale-95"
                              title="Edit Pengguna"
                            >
                              <Edit size={16} strokeWidth={2.5} />
                            </button>

                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-2.5 text-rose-500 bg-slate-50 hover:bg-rose-100 hover:text-rose-700 rounded-xl transition-all border border-slate-100 hover:border-rose-200 active:scale-95"
                              title="Hapus Pengguna"
                            >
                              <Trash2 size={16} strokeWidth={2.5} />
                            </button>
                            
                            {u.is_locked && (
                              <button
                                onClick={() => handleUnlock(u.id, u.name)}
                                className="p-2.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 border border-emerald-200 rounded-xl transition-all active:scale-95 shadow-sm shadow-emerald-100 flex items-center gap-1.5 font-bold text-xs pr-4 ml-2"
                                title="Buka Kunci Akun"
                              >
                                <Unlock size={16} strokeWidth={2.5} /> Buka Kunci
                              </button>
                            )}
                          </>
                        )}
                        {u.role === 'super_admin' && (
                          <span className="text-xs font-bold text-slate-300 italic tracking-wide">Akses Paten</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-slate-600 text-sm">
          <div>
            Menampilkan <span className="font-black text-slate-800">{startIndex}-{endIndex}</span> dari <span className="font-black text-slate-800">{filteredUsers.length}</span> pengguna
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="px-3 py-2 rounded-2xl border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-black">{currentPage} / {totalPages}</span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="px-3 py-2 rounded-2xl border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* FORM MODAL - GLASSMORPHISM UI */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-[0.97] duration-300 relative">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white/50 relative z-10">
              <h2 className="font-black text-xl text-slate-800 flex items-center gap-3 tracking-tight">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Shield size={20} strokeWidth={2.5}/>
                </div>
                {isEditMode ? 'Form Edit Pengguna' : 'Form Akun Baru'}
              </h2>
              <button 
                type="button" 
                onClick={() => setShowModal(false)} 
                className="text-slate-400 hover:bg-slate-100 hover:text-slate-700 p-2 rounded-xl transition-colors active:scale-90 bg-slate-50 border border-slate-100"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="p-8 space-y-6 relative z-10 bg-white">
              <div className="space-y-5">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Nama Lengkap</label>
                  <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Misal: Budi Santoso" className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:ring-4 focus:ring-indigo-600/10 focus:bg-white focus:border-indigo-600 outline-none text-sm font-semibold transition-all text-slate-800"/>
                </div>

                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Email Korporat</label>
                  <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="budi@perusahaan.com" className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:ring-4 focus:ring-indigo-600/10 focus:bg-white focus:border-indigo-600 outline-none text-sm font-semibold transition-all text-slate-800"/>
                </div>
                
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">
                    Akses Keamanan (Password)
                  </label>
                  <input 
                    required={!isEditMode} 
                    type="password"
                    value={password} 
                    onChange={e=>setPassword(e.target.value)} 
                    placeholder={isEditMode ? "Kosongkan jika tidak ingin ganti sandi" : "Min 8 kar (A-Z, a-z, 0-9, Simbol)"} 
                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:ring-4 focus:ring-indigo-600/10 focus:bg-white focus:border-indigo-600 outline-none text-sm font-semibold transition-all text-slate-800"
                  />
                </div>

                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Otoritas (Role)</label>
                  <select value={role} onChange={e=>setRole(e.target.value as UserRole)} className="w-full appearance-none px-4 py-3.5 border-2 border-slate-100 rounded-2xl font-black text-indigo-700 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none cursor-pointer hover:border-indigo-200 transition-all">
                    {user?.role === 'super_admin' && (
                      <option value="admin_spi">Admin SPI</option>
                    )}
                    {user?.role === 'admin_spi' && (
                      <>
                        <option value="auditor">Auditor (Pemeriksa)</option>
                        <option value="auditee">Auditee (Unit Kerja)</option>
                        <option value="manajemen">Manajemen (Eksekutif)</option>
                      </>
                    )}
                  </select>
                </div>

                {role === 'auditor' && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                    <label className="block text-[10px] font-black text-violet-500 uppercase tracking-widest mb-2">Penugasan Level Auditor</label>
                    <select value={level} onChange={e=>setLevel(e.target.value as AuditorLevel)} className="w-full appearance-none px-4 py-3.5 border-2 border-violet-200 rounded-2xl bg-violet-50 font-black text-violet-700 focus:ring-4 focus:ring-violet-500/10 focus:border-violet-600 outline-none cursor-pointer transition-all">
                      <option value="Anggota">Anggota Tim</option>
                      <option value="Ketua Tim">Ketua Tim</option>
                      <option value="Pengendali Teknis">Pengendali Teknis</option>
                    </select>
                  </div>
                )}

                {role === 'auditee' && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-300 space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Pilih Unit Divisi</label>
                      <select required value={isCustomDivisi ? 'Lainnya' : divisi} onChange={e => {
                          if (e.target.value === 'Lainnya') {
                            setIsCustomDivisi(true);
                            setDivisi('');
                          } else {
                            setIsCustomDivisi(false);
                            setDivisi(e.target.value);
                          }
                        }} className="w-full appearance-none px-4 py-3.5 border-2 border-emerald-200 rounded-2xl bg-emerald-50 font-black text-emerald-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none cursor-pointer transition-all">
                        <option value="" disabled>-- Tentukan Divisi --</option>
                        {existingDivisions.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                        <option value="Lainnya">Baru / Lainnya...</option>
                      </select>
                    </div>

                    {isCustomDivisi && (
                      <div className="animate-in zoom-in-95 duration-200">
                        <input required type="text" placeholder="Ketik secara manual entitas baru..." value={divisi} onChange={e => setDivisi(e.target.value)} className="w-full px-4 py-3 border-2 border-emerald-300 rounded-2xl bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none text-sm font-bold text-slate-800 shadow-sm" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="w-1/3 px-4 py-4 border-2 border-slate-200 text-slate-500 font-bold uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-colors active:scale-95"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-2/3 relative group overflow-hidden bg-indigo-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                     <div className="flex gap-2 items-center"><span className="w-4 h-4 border-2 border-t-white border-white/30 rounded-full animate-spin"></span> Memproses</div>
                  ) : 'Simpan Data'}
                  
                  {!isSubmitting && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}