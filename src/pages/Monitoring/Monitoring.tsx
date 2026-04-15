import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Monitor, ChevronDown, Download, ClipboardList, CheckCircle, Clock, Upload, 
  Eye, AlertTriangle, ShieldAlert, CheckSquare, FileText, XCircle, Layers 
} from 'lucide-react';

interface TLTask {
  id: string;
  assessmentId: string;
  assessmentYear: string;
  aspek: string;
  parameterName: string;
  recommendation: string;
  picDivisi: string;
  dueDate: string;
  picAuditor?: string;
  aspectId?: string; 
  indicatorId?: string; 
  parameterId?: string; 
  factorId?: string; 
}

interface TLRecord {
  status: 'Open' | 'In Progress' | 'Submitted' | 'Closed' | 'Rejected';
  fileUrl?: string;
  fileName?: string;
  auditeeNote?: string;
  auditorNote?: string;
}

interface AssessmentMeta {
  id: string;
  year: string;
  tb: string;
  status: string;
}

export default function Monitoring() {
  const { user } = useAuth();
  
  const [viewMode, setViewMode] = useState<'division' | 'level'>('division');
  const [selectedFilter, setSelectedFilter] = useState<string>('Semua');
  
  const [tasks, setTasks] = useState<TLTask[]>([]);
  const [assessmentsList, setAssessmentsList] = useState<AssessmentMeta[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  
  // STATE KE BACKEND
  const [tlRecords, setTlRecords] = useState<Record<string, TLRecord>>({});
  const [inputNotes, setInputNotes] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{url: string, name: string} | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

  // =====================================================================
  // LOGIKA HIERARKI & HAK AKSES (RBAC)
  // =====================================================================
  const userRole = String(user?.role || '').toLowerCase().trim();
  const userLevel = String(user?.level || '').toLowerCase().trim();

  const isAuditee = userRole === 'auditee';
  const isAnggota = userRole === 'auditor' && userLevel === 'anggota';
  
  const isGodMode = 
    ['super_admin', 'admin_spi', 'admin', 'manajemen'].includes(userRole) || 
    (userRole === 'auditor' && ['ketua tim', 'pengendali teknis'].includes(userLevel));

  const fetchData = async () => {
    const token = localStorage.getItem('gcg_token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };

    try {
      const resMaster = await fetch(`${API_URL}/master-indicators`, { headers });
      let aspectsMap: Record<string, string> = {};
      if (resMaster.ok) {
        const md = await resMaster.json();
        md.forEach((a: any) => aspectsMap[a.id] = `${a.id} - ${a.name}`);
      }

      const resAss = await fetch(`${API_URL}/assessments`, { headers });
      if (resAss.ok) {
        const assessments = await resAss.json();
        let extractedTasks: TLTask[] = [];
        let extractedAssessments: AssessmentMeta[] = [];
        
        assessments.forEach((ass: any) => {
          if (ass.status === 'Draft') return; 
          
          extractedAssessments.push({ id: ass.id, year: ass.year, tb: ass.tb, status: ass.status });
          
          if (ass.data && typeof ass.data === 'object') {
            Object.entries(ass.data).forEach(([aspectId, indicators]: [string, any]) => {
              indicators.forEach((ind: any) => {
                ind.parameters.forEach((param: any) => {
                  param.factors.forEach((factor: any) => {
                    if (factor.recommendation && factor.picDivisi && factor.dueDate) {
                      extractedTasks.push({
                        id: `${ass.id}_${aspectId}_${ind.id}_${param.id}_${factor.id}`,
                        assessmentId: ass.id, 
                        assessmentYear: ass.year, 
                        aspek: aspectsMap[aspectId] || `Aspek ${aspectId}`,
                        parameterName: `${param.id} - ${param.parameterName}`, 
                        recommendation: factor.recommendation,
                        picDivisi: factor.picDivisi, 
                        dueDate: factor.dueDate, 
                        picAuditor: factor.picAuditor || 'Sistem',
                        aspectId: aspectId,
                        indicatorId: ind.id,
                        parameterId: param.id,
                        factorId: factor.id
                      });
                    }
                  });
                });
              });
            });
          }
        });
        setTasks(extractedTasks);
        setAssessmentsList(extractedAssessments);
        if (extractedAssessments.length > 0 && !selectedAssessmentId) {
          setSelectedAssessmentId(extractedAssessments[0].id);
        }
      }

      const resTl = await fetch(`${API_URL}/tl-records`, { headers });
      if (resTl.ok) {
        const tlData = await resTl.json();
        setTlRecords(tlData);
      }

    } catch (e) { 
      console.error("Error fetching data monitoring", e); 
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [user, selectedAssessmentId]); 

  // 🔧 FIX: KITA UBAH BIAR BISA NGIRIM FILE FISIK PAKE FORMDATA
  const saveTLToAPI = async (task: TLTask, payloadData: Partial<TLRecord>, fileToUpload?: File) => {
      const token = localStorage.getItem('gcg_token');
      try {
          let bodyData;
          let headers: HeadersInit = { 
              'Authorization': `Bearer ${token}`, 
              'Accept': 'application/json' 
          };

          if (fileToUpload) {
              // Kalau ada file, kita harus pakai FormData (Multipart)
              const formData = new FormData();
              formData.append('assessmentId', task.assessmentId);
              formData.append('aspectId', task.aspectId || '');
              formData.append('indicatorId', task.indicatorId || '');
              formData.append('parameterId', task.parameterId || '');
              formData.append('factorId', task.factorId || '');
              
              Object.entries(payloadData).forEach(([key, value]) => {
                  if (value !== undefined) formData.append(key, value as string);
              });
              
              formData.append('file', fileToUpload); // MENGIRIM FILE FISIK ASLI
              bodyData = formData;
              // CATATAN: Jangan set Content-Type kalau pakai FormData, browser yang akan atur otomatis
          } else {
              // Kalau cuma update status biasa (Tanpa File), tetep pakai JSON
              headers['Content-Type'] = 'application/json';
              bodyData = JSON.stringify({
                  assessmentId: task.assessmentId,
                  aspectId: task.aspectId,
                  indicatorId: task.indicatorId,
                  parameterId: task.parameterId,
                  factorId: task.factorId,
                  ...payloadData
              });
          }

          const res = await fetch(`${API_URL}/tl-records/${task.id}`, {
              method: 'POST',
              headers,
              body: bodyData
          });
          
          if(res.ok) {
              await fetchData(); 
          } else { 
              alert("Gagal menyimpan data ke server."); 
          }
      } catch(e) { alert("Terjadi kesalahan jaringan."); }
  };

  const activeTasks = selectedAssessmentId ? tasks.filter(t => t.assessmentId === selectedAssessmentId) : [];
  
  let visibleTasks = activeTasks;
  if (isAuditee) {
    visibleTasks = activeTasks.filter(t => t.picDivisi === user?.divisi);
  } else if (isAnggota) {
    visibleTasks = activeTasks.filter(t => t.picAuditor === user?.name || t.picAuditor === 'Sistem');
  }

  const activeDivisions = Array.from(new Set(visibleTasks.map(t => t.picDivisi)));
  const activeLevels = Array.from(new Set(visibleTasks.map(t => t.aspek)));

  const totalAol = visibleTasks.length;
  const totalSelesai = visibleTasks.filter(t => tlRecords[t.id]?.status === 'Closed').length;
  const totalProses = visibleTasks.filter(t => tlRecords[t.id]?.status === 'In Progress' || tlRecords[t.id]?.status === 'Submitted').length;
  const totalBelum = totalAol - totalSelesai - totalProses;
  const totalPersen = totalAol === 0 ? '100%' : `${Math.round((totalSelesai / totalAol) * 100)}%`;

  const divisionData = activeDivisions.map((div, idx) => {
    const divTasks = visibleTasks.filter(t => t.picDivisi === div);
    const aol = divTasks.length; 
    const selesai = divTasks.filter(t => tlRecords[t.id]?.status === 'Closed').length;
    const proses = divTasks.filter(t => tlRecords[t.id]?.status === 'In Progress' || tlRecords[t.id]?.status === 'Submitted').length;
    const belum = aol - selesai - proses;
    const persen = aol === 0 ? '100%' : `${Math.round((selesai / aol) * 100)}%`;
    return { no: idx + 1, name: div, aol, selesai, proses, belum, persen };
  });

  const levelData = activeLevels.map((lvl, idx) => {
    const lvlTasks = visibleTasks.filter(t => t.aspek === lvl);
    const aol = lvlTasks.length;
    const selesai = lvlTasks.filter(t => tlRecords[t.id]?.status === 'Closed').length;
    const proses = lvlTasks.filter(t => tlRecords[t.id]?.status === 'In Progress' || tlRecords[t.id]?.status === 'Submitted').length;
    const belum = aol - selesai - proses;
    return { id: idx + 1, name: lvl, aol, selesai, proses, belum };
  });

  const handleStartProgress = (task: TLTask) => {
    saveTLToAPI(task, { status: 'In Progress' });
  };

  const handleSubmitTindakLanjut = (task: TLTask) => {
    if (!selectedFile) return alert("Pilih dokumen bukti tindak lanjut terlebih dahulu!");
    if (selectedFile.size > 10 * 1024 * 1024) return alert("Gagal upload: Ukuran file maksimal 10MB.");
    
    const note = inputNotes[task.id] || ''; 
    
    // 🔧 FIX: Lempar selectedFile langsung ke fungsi API, nggak usah diubah ke Base64
    saveTLToAPI(task, {
        status: 'Submitted',
        auditeeNote: note,
        auditorNote: ''
    }, selectedFile);

    setSelectedFile(null);
    setInputNotes({...inputNotes, [task.id]: ''});
    alert('Bukti dan Keterangan berhasil di-upload! Menunggu verifikasi dari Auditor.');
  };

  const handleVerifyTindakLanjut = (task: TLTask) => {
    if (window.confirm("Approve Tindak Lanjut ini? Status akan ditutup (Closed).")) {
       saveTLToAPI(task, { status: 'Closed' });
       alert('Verifikasi berhasil! Status Tindak Lanjut kini Selesai (Closed).');
    }
  };

  const handleRejectTindakLanjut = (task: TLTask) => {
    if (!rejectNote.trim()) return alert("Catatan penolakan wajib diisi!");
    saveTLToAPI(task, { status: 'Rejected', auditorNote: rejectNote });
    setRejectingId(null);
    setRejectNote('');
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Open': return 'bg-red-100 text-red-700 border-red-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200 animate-pulse';
      case 'In Progress': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Submitted': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Closed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const tasksToShow = (isAuditee || isAnggota) 
    ? visibleTasks 
    : selectedFilter === 'Semua' 
      ? [] 
      : visibleTasks.filter(t => viewMode === 'division' ? t.picDivisi === selectedFilter : t.aspek === selectedFilter);

  const sortedTasks = [...tasksToShow].sort((a, b) => {
    const statA = tlRecords[a.id]?.status || 'Open';
    const statB = tlRecords[b.id]?.status || 'Open';
    if (userRole === 'auditor' && statA === 'Submitted' && statB !== 'Submitted') return -1;
    if (userRole === 'auditor' && statB === 'Submitted' && statA !== 'Submitted') return 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left pb-10 max-w-7xl mx-auto">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
        <div className="flex items-center space-x-5 relative z-10">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 text-white shrink-0">
            <Monitor className="w-8 h-8" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">Monitoring Penilaian</h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">Dashboard Pemantauan Tindak Lanjut (PTL)</p>
          </div>
        </div>
      </div>

      {/* DROPDOWN DINAMIS */}
      <div className="relative max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-100 p-2">
        <div className="relative">
          <select 
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner cursor-pointer transition-all hover:bg-white"
            value={selectedAssessmentId}
            onChange={(e) => {
              setSelectedAssessmentId(e.target.value);
              setSelectedFilter('Semua'); 
            }}
          >
            {assessmentsList.length === 0 ? (
               <option value="">Belum ada Assessment berjalan</option>
            ) : (
               assessmentsList.map(ass => (
                 <option key={ass.id} value={ass.id}>
                   Assessment GCG TB {ass.year} - {ass.tb} (Status: {ass.status})
                 </option>
               ))
            )}
          </select>
          <div className="absolute right-4 top-4 w-6 h-6 bg-white rounded-md flex items-center justify-center border border-slate-200 pointer-events-none shadow-sm">
            <ChevronDown className="w-4 h-4 text-slate-500" strokeWidth={3}/>
          </div>
        </div>
      </div>

      {/* --- 4 KARTU STATISTIK SUMMARY --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full blur-2xl -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">{isAnggota ? 'Tugas Saya' : 'Total Rekomendasi (AOL)'}</span>
          <div className="flex justify-between items-end relative z-10">
            <span className="text-4xl font-black text-slate-800 tracking-tighter">{totalAol}</span>
            <div className="p-3 bg-slate-50 rounded-2xl text-slate-400"><ClipboardList strokeWidth={2} size={24}/></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm flex flex-col hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full blur-2xl -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 relative z-10">Belum Dikerjakan</span>
          <div className="flex justify-between items-end relative z-10">
            <span className="text-4xl font-black text-rose-600 tracking-tighter">{totalBelum}</span>
            <div className="p-3 bg-rose-50 rounded-2xl text-rose-400"><AlertTriangle strokeWidth={2} size={24}/></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm flex flex-col hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 relative z-10">Sedang Diproses</span>
          <div className="flex justify-between items-end relative z-10">
            <span className="text-4xl font-black text-indigo-600 tracking-tighter">{totalProses}</span>
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-400"><ShieldAlert strokeWidth={2} size={24}/></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex flex-col hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 relative z-10">Selesai (Closed)</span>
          <div className="flex justify-between items-end relative z-10">
            <span className="text-4xl font-black text-emerald-600 tracking-tighter">{totalSelesai}</span>
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-400"><CheckCircle strokeWidth={2} size={24}/></div>
          </div>
        </div>
      </div>

      {/* --- CONTROL PANEL & TABEL (HANYA MUNCUL BUAT GOD MODE / ADMIN) --- */}
      {isGodMode && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => { setViewMode('division'); setSelectedFilter('Semua'); }} className={`px-5 py-2.5 text-xs font-black rounded-lg transition-all uppercase tracking-wider ${viewMode === 'division' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}>Report By Division</button>
              <button onClick={() => { setViewMode('level'); setSelectedFilter('Semua'); }} className={`px-5 py-2.5 text-xs font-black rounded-lg transition-all uppercase tracking-wider ${viewMode === 'level' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}>Report By Level</button>
            </div>
            
            <button className="flex items-center px-5 py-3 border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 hover:text-indigo-600 uppercase tracking-widest shadow-sm bg-white transition-all active:scale-95 group">
              <Download className="w-4 h-4 mr-2 text-slate-400 group-hover:text-indigo-500 transition-colors" strokeWidth={2.5}/> Export Laporan PDF
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Layers size={16} className="text-indigo-500"/> Rekapitulasi {viewMode === 'division' ? 'Per Unit Kerja' : 'Per Aspek GCG'}
              </h2>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest border border-slate-200 px-2.5 py-1 rounded-md bg-white">Klik Baris Tampil Rincian</span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              {viewMode === 'division' ? (
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-white text-slate-400 uppercase text-[10px] font-black tracking-widest border-b-2 border-slate-100">
                    <tr>
                      <th rowSpan={2} className="px-6 py-4 border-b border-r border-slate-100 text-center w-12">No</th>
                      <th rowSpan={2} className="px-6 py-4 border-b border-r border-slate-100">Unit Kerja Bisnis</th>
                      <th rowSpan={2} className="px-6 py-4 border-b border-r border-slate-100 text-center">Pencapaian<br/>(Jumlah AOL)</th>
                      <th colSpan={3} className="px-6 py-2 border-b border-r border-slate-100 text-center bg-indigo-50/50 text-indigo-600">Progres Tindak Lanjut</th>
                      <th rowSpan={2} className="px-6 py-4 border-b border-slate-100 text-center">% Tindak Lanjut</th>
                    </tr>
                    <tr className="bg-white">
                      <th className="px-6 py-2 border-b border-r border-slate-100 text-center text-emerald-500">Selesai</th>
                      <th className="px-6 py-2 border-b border-r border-slate-100 text-center text-indigo-500">Proses</th>
                      <th className="px-6 py-2 border-b border-r border-slate-100 text-center text-rose-500">Belum TL</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 text-[12px]">
                    {divisionData.map((item) => (
                      <tr key={item.name} className={`border-b border-slate-50 transition-colors cursor-pointer group ${selectedFilter === item.name ? 'bg-indigo-50/70 border-l-4 border-indigo-500' : 'hover:bg-slate-50 border-l-4 border-transparent'}`} onClick={() => setSelectedFilter(item.name === selectedFilter ? 'Semua' : item.name)}>
                        <td className="px-6 py-4 text-center border-r border-slate-50">{item.no}</td>
                        <td className="px-6 py-4 font-bold border-r border-slate-50 text-slate-800 group-hover:text-indigo-600 transition-colors">{item.name}</td>
                        <td className="px-6 py-4 text-center border-r border-slate-50 font-black text-slate-900 bg-slate-50/30">{item.aol}</td>
                        <td className="px-6 py-4 text-center border-r border-slate-50 font-semibold">{item.selesai}</td>
                        <td className="px-6 py-4 text-center border-r border-slate-50 font-semibold">{item.proses}</td>
                        <td className="px-6 py-4 text-center border-r border-slate-50 font-semibold">{item.belum}</td>
                        <td className="px-6 py-4 text-center font-bold text-indigo-700 bg-slate-50/30">{item.persen}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest">
                    <tr>
                      <td colSpan={2} className="px-6 py-5 text-right border-r border-white/10">Total Keseluruhan</td>
                      <td className="px-6 py-5 text-center border-r border-white/10 text-indigo-300 text-sm font-black">{totalAol}</td>
                      <td className="px-6 py-5 text-center border-r border-white/10 text-emerald-400">{totalSelesai}</td>
                      <td className="px-6 py-5 text-center border-r border-white/10 text-indigo-400">{totalProses}</td>
                      <td className="px-6 py-5 text-center border-r border-white/10 text-rose-400">{totalBelum}</td>
                      <td className="px-6 py-5 text-center text-sm font-black text-emerald-400">{totalPersen}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-white text-slate-400 uppercase text-[10px] font-black tracking-widest border-b-2 border-slate-100">
                    <tr>
                      <th className="px-6 py-4 border-b border-r border-slate-100 w-[50%]">Aspek GCG</th>
                      <th className="px-6 py-4 border-b border-r border-slate-100 text-center">Jumlah AOI</th>
                      <th colSpan={3} className="px-6 py-2 border-b border-slate-100 text-center bg-indigo-50/50 text-indigo-600">Status Tindak Lanjut</th>
                    </tr>
                    <tr className="bg-white">
                      <th className="border-r border-slate-100"></th>
                      <th className="border-r border-slate-100"></th>
                      <th className="px-6 py-2 border-b border-r border-slate-100 text-center text-rose-500">Belum TL</th>
                      <th className="px-6 py-2 border-b border-r border-slate-100 text-center text-indigo-500">Sedang Proses</th>
                      <th className="px-6 py-2 border-b border-slate-100 text-center text-emerald-500">Selesai</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 text-[12px]">
                    {levelData.map((item) => (
                      <tr key={item.name} className={`border-b border-slate-50 transition-colors cursor-pointer group ${selectedFilter === item.name ? 'bg-indigo-50/70 border-l-4 border-indigo-500' : 'hover:bg-slate-50 border-l-4 border-transparent'}`} onClick={() => setSelectedFilter(item.name === selectedFilter ? 'Semua' : item.name)}>
                        <td className="px-6 py-4 font-bold border-r border-slate-50 text-slate-800 group-hover:text-indigo-600 transition-colors">{item.name}</td>
                        <td className="px-6 py-4 text-center border-r border-slate-50 font-black text-slate-900 bg-slate-50/30">{item.aol}</td>
                        <td className="px-6 py-4 text-center border-r border-slate-50 font-semibold">{item.belum}</td>
                        <td className="px-6 py-4 text-center border-r border-slate-50 font-semibold">{item.proses}</td>
                        <td className="px-6 py-4 text-center font-semibold">{item.selesai}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- RINCIAN TUGAS (ACTION PLAN KANBAN) --- */}
      <div className={`mt-8 ${isGodMode ? 'pt-8 border-t border-slate-200/60' : ''}`}>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Rincian Tindak Lanjut Unit</h2>
            <p className="text-sm font-bold text-slate-500 mt-1">Daftar Area of Improvement (AOI) dan Action Plan</p>
          </div>
          {selectedFilter !== 'Semua' && (
            <span className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-indigo-500/30">
              <span className="opacity-80"><Layers size={14}/></span> Filter: {selectedFilter}
              <button onClick={() => setSelectedFilter('Semua')} className="hover:bg-white/20 p-1 rounded-lg transition-colors border border-white/20"><XCircle size={14}/></button>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
          {selectedFilter === 'Semua' && isGodMode ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center animate-in fade-in flex flex-col items-center">
              <div className="w-24 h-24 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center mb-6"><Layers size={40} strokeWidth={1.5}/></div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Pilih Data Secara Spesifik</h3>
              <p className="text-slate-500 font-medium text-sm max-w-md">Klik salah satu Unit Kerja Bisnis atau Aspek pada tabel rekapitulasi di atas untuk langsung melihat rincian progres tindak lanjut.</p>
            </div>
          ) : 
          sortedTasks.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center animate-in fade-in flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6"><ClipboardList size={40} strokeWidth={1.5}/></div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Tidak Ada Tugas Ditemukan</h3>
              <p className="text-slate-500 font-medium text-sm max-w-md">Wow! Segala sesuatunya bersih. Belum ada rekomendasi tindak lanjut baru untuk unit kerja Anda.</p>
            </div>
          ) : (
            sortedTasks.map(task => {
              const record = tlRecords[task.id] || { status: 'Open' };
              const status = record.status;
              const isOverdue = status === 'Open' && new Date(task.dueDate).getTime() < new Date().getTime();
              
              const isMyTask = task.picAuditor === user?.name || task.picAuditor === 'Sistem';
              const canShowApprove = isGodMode || (isAnggota && isMyTask);

              return (
                <div key={task.id} className={`bg-white p-6 md:p-8 rounded-3xl border border-slate-100 hover:shadow-xl hover:shadow-indigo-100 hover:border-indigo-200 transition-all duration-300 flex flex-col lg:flex-row gap-8 items-start justify-between animate-in slide-in-from-bottom-4 group relative overflow-hidden`}>
                  
                  {status === 'Closed' && <div className="absolute inset-0 bg-emerald-50/30 w-full h-full pointer-events-none"></div>}
                  {status === 'Submitted' && <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none opacity-50"></div>}

                  {/* Info Sebelah Kiri */}
                  <div className="flex-1 space-y-4 w-full relative z-10">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">TB {task.assessmentYear}</span>
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 uppercase tracking-widest truncate max-w-[200px] md:max-w-none">{task.aspek}</span>
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1.5 ${getStatusColor(status)}`}>
                        {status === 'Open' && <AlertTriangle size={12}/>}
                        {status === 'Closed' && <CheckCircle size={12}/>}
                        {status === 'In Progress' && <Clock size={12}/>}
                        {status === 'Submitted' && <Upload size={12}/>}
                        {status === 'Rejected' && <XCircle size={12}/>}
                        {status}
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{task.parameterName}</h3>
                      <div className="mt-4 p-5 bg-rose-50/50 border border-rose-100/50 rounded-2xl text-sm text-slate-700 leading-relaxed flex gap-4 shadow-sm relative overflow-hidden">
                        <div className="absolute left-0 top-0 w-1 h-full bg-rose-500"></div>
                        <ShieldAlert className="text-rose-400 shrink-0 mt-0.5" strokeWidth={2.5} size={20} />
                        <div>
                          <p className="font-semibold text-slate-800">{task.recommendation}</p>
                          <p className="text-[10px] text-rose-500 mt-2 font-black uppercase tracking-widest bg-rose-100/50 px-2 py-0.5 rounded w-max">Tugasan Dari: {task.picAuditor}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-slate-500 pt-4 border-t border-slate-100 mt-5">
                      <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500"><ClipboardList size={12} strokeWidth={3}/></div> PIC Bagian: <span className="text-indigo-700 font-black">{task.picDivisi}</span></div>
                      <div className="flex items-center gap-2"><div className={`w-6 h-6 rounded-full ${isOverdue ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'} flex items-center justify-center`}><Clock size={12} strokeWidth={3}/></div> Batas Waktu: <span className={`${isOverdue ? 'text-rose-600 font-black' : 'text-amber-700 font-black'}`}>{task.dueDate}</span></div>
                    </div>

                    {status === 'Rejected' && record.auditorNote && (
                      <div className="mt-4 bg-rose-50 border border-rose-200 p-4 rounded-2xl flex gap-3 text-rose-700 animate-pulse shadow-sm">
                         <XCircle className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={2.5}/>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-rose-500">Berkas Ditolak Auditor: Revisi Diperlukan</p>
                          <p className="text-sm font-bold">{record.auditorNote}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tombol Aksi Kanan */}
                  <div className="w-full lg:w-72 flex flex-col gap-4 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8 relative z-10 self-stretch justify-center">
                    
                    {(status === 'Open' || status === 'Rejected') && isAuditee && (
                      <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center h-full group-hover:border-indigo-200 transition-colors">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-300 shadow-sm mb-4"><ClipboardList size={20} strokeWidth={2}/></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-4 text-center tracking-widest">Kerahkan Upaya Baru</p>
                        <button onClick={() => handleStartProgress(task)} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 text-xs flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest">
                           Mulai Eksekusi <ChevronDown size={14} className="-rotate-90" strokeWidth={3}/>
                        </button>
                      </div>
                    )}

                    {(status === 'Open' || status === 'Rejected') && !isAuditee && (
                      <div className="text-center text-slate-400 my-auto bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" strokeWidth={1.5} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Menunggu Respons PIC Divisi</p>
                      </div>
                    )}

                    {status === 'In Progress' && isAuditee && (
                      <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                          <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Upload Berkas Bukti TL</p>
                        </div>
                        
                        <label className="flex items-center justify-center w-full bg-white border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold py-3 rounded-xl cursor-pointer text-[11px] uppercase tracking-widest transition-colors mb-3">
                           <Upload size={14} className="mr-2"/> {selectedFile ? 'Ganti Dokumen' : 'Pilih File (PDF/XLS)'}
                           <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf, .xls, .xlsx" />
                        </label>
                        {selectedFile && <p className="text-[9px] font-bold text-indigo-500 mb-3 truncate bg-white px-2 py-1 rounded-md text-center border border-indigo-100 shadow-sm">{selectedFile.name}</p>}
                        
                        <textarea className="w-full text-xs p-3.5 mb-3 border-2 border-white rounded-xl bg-white focus:bg-white focus:border-indigo-400 outline-none resize-none shadow-sm transition-all" rows={2} placeholder="Ketik keterangan (opsional)..." value={inputNotes[task.id] || ''} onChange={(e) => setInputNotes({...inputNotes, [task.id]: e.target.value})} />
                        
                        <button onClick={() => handleSubmitTindakLanjut(task)} className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-black py-3.5 rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/30 text-[11px] flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest">Kirim Untuk Verifikasi <CheckCircle size={14} strokeWidth={3}/></button>
                      </div>
                    )}

                    {status === 'In Progress' && !isAuditee && (
                      <div className="text-center text-amber-600 my-auto bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                        <div className="relative w-10 h-10 mx-auto mb-3">
                          <div className="absolute inset-0 bg-amber-400 opacity-20 rounded-full animate-ping"></div>
                          <Clock className="w-full h-full text-amber-500 relative z-10" strokeWidth={1.5} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Sedang Dalam Proses Evaluasi PIC</p>
                      </div>
                    )}

                    {status === 'Submitted' && (
                      <div className="bg-white border-2 border-indigo-100 p-5 rounded-2xl text-center shadow-lg shadow-indigo-100/50 flex flex-col h-full justify-center">
                        <div className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-4 mx-auto animate-pulse">Butuh Verifikasi</div>
                        
                        {record.auditeeNote && (
                          <div className="bg-slate-50 p-3 rounded-xl text-[10px] text-slate-600 border border-slate-100 text-left mb-4 shadow-inner">
                            <span className="font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Keterangan Divisi:</span><span className="font-bold text-slate-700">"{record.auditeeNote}"</span>
                          </div>
                        )}
                        
                        <button onClick={() => setViewingDoc({url: record.fileUrl!, name: record.fileName!})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-black py-3 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all text-[11px] mb-4 flex items-center justify-center gap-2 uppercase tracking-widest"><FileText size={14} strokeWidth={2.5}/> Tinjau Bukti Dokumen</button>

                        {canShowApprove ? (
                          rejectingId === task.id ? (
                            <div className="space-y-3 animate-in zoom-in-95 bg-rose-50 p-3 rounded-xl border border-rose-200">
                              <input type="text" placeholder="Masukkan alasan penolakan..." value={rejectNote} onChange={e => setRejectNote(e.target.value)} className="w-full text-xs p-2.5 font-bold border border-rose-200 rounded-lg outline-none focus:border-rose-400 bg-white" />
                              <div className="flex gap-2">
                                <button onClick={() => handleRejectTindakLanjut(task)} className="flex-1 bg-red-600 text-white text-[10px] uppercase tracking-widest font-black py-2.5 rounded-lg active:scale-95 shadow-lg shadow-red-500/30">Kirim Penolakan</button>
                                <button onClick={() => setRejectingId(null)} className="px-4 bg-white text-slate-500 border border-slate-200 text-[10px] uppercase tracking-widest font-black py-2.5 rounded-lg hover:bg-slate-100">Batal</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2.5">
                              <button onClick={() => handleVerifyTindakLanjut(task)} className="flex-1 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white font-black py-3 rounded-xl hover:from-emerald-500 hover:to-emerald-600 transition-all text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-1.5 active:scale-95"><CheckSquare size={14} strokeWidth={3}/> Setujui</button>
                              <button onClick={() => setRejectingId(task.id)} className="px-5 bg-white border border-rose-200 text-rose-600 font-black py-3 rounded-xl hover:bg-rose-50 transition-all text-[10px] uppercase tracking-widest shadow-sm">Tolak</button>
                            </div>
                          )
                        ) : !isAuditee ? (
                          <div className="bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-lg mt-2 inline-block mx-auto">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ShieldAlert size={10}/> Akses Auditor Khusus</p>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {status === 'Closed' && (
                      <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-2xl text-center shadow-sm h-full flex flex-col justify-center">
                        <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" strokeWidth={2} />
                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-4 tracking-widest">Penyelesaian Berhasil</p>
                        <button onClick={() => setViewingDoc({url: record.fileUrl!, name: record.fileName!})} className="w-full bg-white border border-emerald-200 text-emerald-700 font-black py-3 rounded-xl hover:bg-emerald-600 hover:text-white transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"><Eye size={14} strokeWidth={2.5}/> Lihat Arsip Berkas</button>
                      </div>
                    )}
                    
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* PDF VIEWER MODAL */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-[0.98] duration-300 border border-slate-200">
            <div className="bg-slate-900 px-8 py-5 flex justify-between items-center text-white shrink-0 shadow-lg relative z-10">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-indigo-500/20 rounded-xl"><FileText size={24} className="text-indigo-400" strokeWidth={2}/></div>
                <div>
                  <h2 className="text-sm font-black tracking-wide truncate max-w-lg leading-tight uppercase">{viewingDoc.name}</h2>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Arsip Bukti Dokumen TL</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <a href={viewingDoc.url} target="_blank" download className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 border border-indigo-400/50">
                  <Download size={14} strokeWidth={3}/> Unduh Asli
                </a>
                <button onClick={() => setViewingDoc(null)} className="p-2.5 bg-white/5 hover:bg-rose-500 hover:text-white rounded-xl transition-all active:scale-90 text-slate-400">
                  <XCircle size={20} strokeWidth={2.5}/>
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center p-2">
               {viewingDoc.url && viewingDoc.url.endsWith('.pdf') ? (
                 <iframe src={viewingDoc.url} title={viewingDoc.name} className="w-full h-full border-none rounded-2xl bg-white shadow-inner"/>
               ) : (
                 <div className="flex flex-col items-center justify-center p-12 text-center max-w-md bg-white rounded-3xl shadow-sm border border-slate-200">
                   <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6"><AlertTriangle size={48} className="text-slate-300" strokeWidth={1.5} /></div>
                   <h3 className="text-xl font-black text-slate-800 mb-2 truncate w-full px-4">{viewingDoc.name}</h3>
                   <p className="text-slate-500 text-sm font-medium mb-8">Pratinjau langsung hanya didukung untuk format dokumen PDF. Silakan unduh untuk melihat konten selengkapnya.</p>
                   {viewingDoc.url && (
                    <a href={viewingDoc.url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/30 active:scale-95 flex items-center gap-2">
                      <Download size={16} strokeWidth={3}/> Download File
                    </a>
                   )}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}