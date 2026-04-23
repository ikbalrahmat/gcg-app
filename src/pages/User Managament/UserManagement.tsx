import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { Users, Plus, Shield, Search, Trash2, Edit, X, Unlock, UserCheck, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { User, UserRole, AuditorLevel } from '../../types';

const MASTER_DIVISIONS = [
  "Satuan Pengawasan Intern",
  "Sekretariat Perusahaan",
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
  "Tata Kelola, Risiko, dan Kepatuhan",
  "Dewan Pengawas",
  "Sekretariat Dewan Pengawas",
  "Komite Audit",
  "Komite Pemantauan Risiko",
  "Komite Nominasi dan Remunerasi",
];

export default function UserManagement() {
  const { user } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Filter & Pagination States
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
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
      const response = await fetchApi('/users', {});
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
  }, [search, roleFilter, pageSize, users]);

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

  // LOGIKA FILTERING (Search & Role Filter)
  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const startIndex = filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredUsers.length);
  const currentPageUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 pb-10 text-left animate-in fade-in duration-500 max-w-7xl mx-auto min-w-0">
      
      {/* HEADER SECTION (Clean, Standard Corporate UI) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-600 rounded-xl shadow-md shadow-indigo-200">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
              Manajemen Akun
            </h1>
            <p className="text-sm font-medium text-slate-500">
              {user?.role === 'super_admin' ? 'Kelola akses untuk Admin SPI di portal ini.' : 'Kelola otorisasi Auditor, Auditee, dan tingkat Manajemen.'}
            </p>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus size={18} strokeWidth={2.5} /> Tambah Baru
        </button>
      </div>

      {/* FILTER & TABLE SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Toolbar (Search + Role Filter + Pagination Rows) */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-3.5 top-2.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 bg-white hover:border-slate-300 focus:bg-white rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:font-normal placeholder:text-slate-400"
              />
            </div>

            {/* Filter Role (DINAMIS SESUAI HAK AKSES LOGIN) */}
            <div className="relative w-full sm:w-48">
              <Filter className="absolute left-3.5 top-2.5 text-slate-400 pointer-events-none" size={16} />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white hover:border-slate-300 focus:bg-white rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
              >
                <option value="all">Semua Role</option>
                {user?.role === 'super_admin' && (
                  <>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin_spi">Admin SPI</option>
                    <option value="auditor">Auditor</option>
                    <option value="auditee">Auditee</option>
                    <option value="manajemen">Manajemen</option>
                  </>
                )}
                {user?.role === 'admin_spi' && (
                  <>
                    <option value="auditor">Auditor</option>
                    <option value="auditee">Auditee</option>
                    <option value="manajemen">Manajemen</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 w-full xl:w-auto">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Baris</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="hidden sm:block h-5 w-px bg-slate-200"></div>
            <div className="text-slate-500 text-xs font-semibold">
              <span className="text-slate-800">{startIndex}-{endIndex}</span> dari <span className="text-slate-800">{filteredUsers.length}</span>
            </div>
          </div>
        </div>

        {/* Table wrapper */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 whitespace-nowrap">Identitas Pengguna</th>
                <th className="px-5 py-3 whitespace-nowrap">Otoritas (Role)</th>
                <th className="px-5 py-3 whitespace-nowrap">Detail Penugasan</th>
                <th className="px-5 py-3 whitespace-nowrap text-center w-32">Tindakan</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                    <div className="flex flex-col items-center justify-center">
                      <UserCheck className="w-12 h-12 text-slate-300 mb-3" strokeWidth={1.5} />
                      <p className="text-base font-bold text-slate-700">Tidak ada pengguna ditemukan</p>
                      <p className="text-xs mt-1">Coba sesuaikan pencarian atau filter role.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentPageUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-black text-sm shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-tight">{u.name}</p>
                          <p className="text-xs text-slate-500 font-medium">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1.5 items-start">
                        {u.role === 'auditor' && (
                          <span className="text-violet-700 bg-violet-50 px-2.5 py-1 border border-violet-100 rounded-md text-[10px] font-bold tracking-widest uppercase">
                            Level: {u.level || 'Anggota'}
                          </span>
                        )}
                        {u.role === 'auditee' && (
                          <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-100 rounded-md text-[10px] font-bold tracking-widest uppercase">
                            Divisi: {u.divisi || '-'}
                          </span>
                        )}
                        {u.role !== 'auditor' && u.role !== 'auditee' && (
                          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest px-1">-</span>
                        )}

                        {/* Status Terkunci */}
                        {u.is_locked && (
                          <span className="mt-1 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase flex items-center gap-1">
                            <Shield size={12} strokeWidth={2.5} /> Terkunci (Gagal 3x)
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center space-x-2">
                        {u.role !== 'super_admin' && (
                          <>
                            <button
                              onClick={() => openEdit(u)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                              title="Edit Pengguna"
                            >
                              <Edit size={16} strokeWidth={2} />
                            </button>

                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                              title="Hapus Pengguna"
                            >
                              <Trash2 size={16} strokeWidth={2} />
                            </button>
                            
                            {u.is_locked && (
                              <button
                                onClick={() => handleUnlock(u.id, u.name)}
                                className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 border border-emerald-200 rounded-lg transition-all text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider"
                                title="Buka Kunci Akun"
                              >
                                <Unlock size={14} /> Buka
                              </button>
                            )}
                          </>
                        )}
                        {u.role === 'super_admin' && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Akses Paten</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Halaman <span className="font-bold text-slate-800">{currentPage}</span> dari <span className="font-bold text-slate-800">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* FORM MODAL (Lebih Compact & Clean) */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 animate-in zoom-in-[0.98] duration-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-black text-lg text-slate-800 flex items-center gap-2.5 tracking-tight">
                <Shield size={18} className="text-indigo-600"/>
                {isEditMode ? 'Form Edit Pengguna' : 'Form Akun Baru'}
              </h2>
              <button 
                type="button" 
                onClick={() => setShowModal(false)} 
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition-colors"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
                  <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Misal: Budi Santoso" className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-semibold transition-all text-slate-800"/>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Korporat</label>
                  <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="budi@perusahaan.com" className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-semibold transition-all text-slate-800"/>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Akses Keamanan (Password)</label>
                  <input 
                    required={!isEditMode} 
                    type="password"
                    value={password} 
                    onChange={e=>setPassword(e.target.value)} 
                    placeholder={isEditMode ? "Kosongkan jika tidak ganti sandi" : "Min 8 kar (A-Z, a-z, 0-9, Simbol)"} 
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-semibold transition-all text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Otoritas (Role)</label>
                  <select value={role} onChange={e=>setRole(e.target.value as UserRole)} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-bold text-indigo-700 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer transition-all">
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
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-1.5">Penugasan Level Auditor</label>
                    <select value={level} onChange={e=>setLevel(e.target.value as AuditorLevel)} className="w-full px-3 py-2.5 border border-violet-200 rounded-xl bg-violet-50 font-bold text-violet-700 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none cursor-pointer transition-all">
                      <option value="Anggota">Anggota Tim</option>
                      <option value="Ketua Tim">Ketua Tim</option>
                      <option value="Pengendali Teknis">Pengendali Teknis</option>
                    </select>
                  </div>
                )}

                {role === 'auditee' && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200 space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">Pilih Unit Divisi</label>
                      <select required value={isCustomDivisi ? 'Lainnya' : divisi} onChange={e => {
                          if (e.target.value === 'Lainnya') {
                            setIsCustomDivisi(true);
                            setDivisi('');
                          } else {
                            setIsCustomDivisi(false);
                            setDivisi(e.target.value);
                          }
                        }} className="w-full px-3 py-2.5 border border-emerald-200 rounded-xl bg-emerald-50 font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer transition-all">
                        <option value="" disabled>-- Tentukan Divisi --</option>
                        {existingDivisions.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                        <option value="Lainnya">Baru / Lainnya...</option>
                      </select>
                    </div>

                    {isCustomDivisi && (
                      <div className="animate-in fade-in duration-200">
                        <input required type="text" placeholder="Ketik manual nama divisi baru..." value={divisi} onChange={e => setDivisi(e.target.value)} className="w-full px-3 py-2.5 border border-emerald-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-semibold text-slate-800 shadow-sm" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="w-1/3 px-4 py-2.5 border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors active:scale-95 text-sm"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-2/3 bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting ? (
                     <><span className="w-4 h-4 border-2 border-t-white border-white/30 rounded-full animate-spin"></span> Memproses...</>
                  ) : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}