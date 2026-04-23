import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Monitor, ChevronDown, Download, ClipboardList, CheckCircle, Clock, Upload, 
  Eye, AlertTriangle, ShieldAlert, CheckSquare, FileText, XCircle, Layers, Target, CheckCircle2, ChevronUp, RefreshCw, Search 
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
  const [searchQuery, setSearchQuery] = useState<string>(''); // FITUR SEARCH BARU
  
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

  // STATE UNTUK EXPANDABLE TABLE ROW
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

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
    const headers = {  'Accept': 'application/json' };

    try {
      const resMaster = await fetchApi('/master-indicators', { headers });
      let aspectsMap: Record<string, string> = {};
      if (resMaster.ok) {
        const md = await resMaster.json();
        md.forEach((a: any) => aspectsMap[a.id] = `${a.id} - ${a.name}`);
      }

      const resDiv = await fetchApi('/divisions', { headers });
      let divisionsList: string[] = [];
      if (resDiv.ok) {
        divisionsList = await resDiv.json();
      }

      const resAss = await fetchApi('/assessments', { headers });
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
                      let divTargets: string[] = [];
                      if (factor.picDivisi.includes('|')) {
                        divTargets = factor.picDivisi.split('|').map((d: string) => d.trim()).filter((d: string) => Boolean(d));
                      } else {
                        let tempStr = factor.picDivisi;
                        divisionsList.filter((d: string) => d.includes(',')).forEach((div: string) => {
                          if (tempStr.includes(div)) {
                            divTargets.push(div);
                            tempStr = tempStr.replace(div, '');
                          }
                        });
                        const remaining = tempStr.split(',').map((d: string) => d.trim()).filter((d: string) => Boolean(d));
                        divTargets = [...divTargets, ...remaining];
                      }
                      divTargets.forEach((divName: string) => {
                        extractedTasks.push({
                          id: `${ass.id}_${aspectId}_${ind.id}_${param.id}_${factor.id}_${divName.replace(/[\s&]/g,'')}`,
                          assessmentId: ass.id, 
                          assessmentYear: ass.year, 
                          aspek: aspectsMap[aspectId] || `Aspek ${aspectId}`,
                          parameterName: `${param.id} - ${param.parameterName}`, 
                          recommendation: factor.recommendation,
                          picDivisi: divName, 
                          dueDate: factor.dueDate, 
                          picAuditor: factor.picAuditor || 'Sistem',
                          aspectId: aspectId,
                          indicatorId: ind.id,
                          parameterId: param.id,
                          factorId: factor.id
                        });
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

      const resTl = await fetchApi('/tl-records', { headers });
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

  const saveTLToAPI = async (task: TLTask, payloadData: Partial<TLRecord>, fileToUpload?: File) => {
      try {
          let bodyData;
          let headers: HeadersInit = { 
              'Accept': 'application/json' 
          };

          if (fileToUpload) {
              const formData = new FormData();
              formData.append('assessmentId', task.assessmentId);
              formData.append('aspectId', task.aspectId || '');
              formData.append('indicatorId', task.indicatorId || '');
              formData.append('parameterId', task.parameterId || '');
              formData.append('factorId', task.factorId || '');
              
              Object.entries(payloadData).forEach(([key, value]) => {
                  if (value !== undefined) formData.append(key, value as string);
              });
              
              formData.append('file', fileToUpload); 
              bodyData = formData;
          } else {
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

          const res = await fetchApi(`/tl-records/${task.id}`, {
              method: 'POST',
              headers,
              body: bodyData
          });
          
          if(res.ok) {
              await fetchData(); 
              if (payloadData.status === 'Submitted' || payloadData.status === 'Closed' || payloadData.status === 'Rejected') {
                setExpandedTaskId(null);
              }
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

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId(prev => prev === taskId ? null : taskId);
    if (expandedTaskId !== taskId) {
      setRejectingId(null);
      setRejectNote('');
      setSelectedFile(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Open': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'In Progress': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Submitted': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Closed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // LOGIKA FILTER DAN SEARCH BARU
  let baseFilteredTasks = visibleTasks;
  if (isGodMode && !searchQuery) {
    if (selectedFilter === 'Semua') {
      baseFilteredTasks = []; // Hide if no filter selected and no search typed
    } else {
      baseFilteredTasks = visibleTasks.filter(t => viewMode === 'division' ? t.picDivisi === selectedFilter : t.aspek === selectedFilter);
    }
  } else if (isGodMode && searchQuery) {
    // Jika ada pencarian, tampilkan hasil pencarian meskipun selectedFilter === 'Semua'
    if (selectedFilter !== 'Semua') {
      baseFilteredTasks = visibleTasks.filter(t => viewMode === 'division' ? t.picDivisi === selectedFilter : t.aspek === selectedFilter);
    }
  }

  // Filter tambahan berdasarkan query pencarian
  const finalFilteredTasks = baseFilteredTasks.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.parameterName.toLowerCase().includes(q) ||
      t.recommendation.toLowerCase().includes(q) ||
      t.picDivisi.toLowerCase().includes(q) ||
      t.aspek.toLowerCase().includes(q)
    );
  });

  const sortedTasks = [...finalFilteredTasks].sort((a, b) => {
    const statA = tlRecords[a.id]?.status || 'Open';
    const statB = tlRecords[b.id]?.status || 'Open';
    if (userRole === 'auditor' && statA === 'Submitted' && statB !== 'Submitted') return -1;
    if (userRole === 'auditor' && statB === 'Submitted' && statA !== 'Submitted') return 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left pb-10 max-w-7xl mx-auto min-w-0 font-sans">
      
      {/* --- HEADER & DROPDOWN --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-600 rounded-xl shadow-md shadow-indigo-200">
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Monitoring Penilaian</h1>
            <p className="text-sm font-medium text-slate-500">Dashboard Pemantauan Tindak Lanjut (PTL)</p>
          </div>
        </div>

        <div className="w-full md:w-80 relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Target className="w-4 h-4 text-indigo-500" />
          </div>
          <select 
            className="w-full appearance-none bg-white border border-slate-300 rounded-xl py-2.5 pl-10 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
            value={selectedAssessmentId}
            onChange={(e) => {
              setSelectedAssessmentId(e.target.value);
              setSelectedFilter('Semua'); 
              setExpandedTaskId(null); 
              setSearchQuery('');
            }}
          >
            {assessmentsList.length === 0 ? (
               <option value="">Belum ada Assessment</option>
            ) : (
               assessmentsList.map(ass => (
                 <option key={ass.id} value={ass.id}>
                   Dashboard TB {ass.year} - {ass.tb}
                 </option>
               ))
            )}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* --- 4 KARTU STATISTIK SUMMARY --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{isAnggota ? 'Tugas Saya' : 'Total Rekomendasi'}</span>
            <span className="text-3xl font-black text-slate-800 leading-none">{totalAol}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl text-slate-500 shrink-0"><ClipboardList strokeWidth={2} size={24}/></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Belum Dikerjakan</span>
            <span className="text-3xl font-black text-rose-600 leading-none">{totalBelum}</span>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-500 shrink-0"><AlertTriangle strokeWidth={2} size={24}/></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Sedang Diproses</span>
            <span className="text-3xl font-black text-indigo-600 leading-none">{totalProses}</span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0"><ShieldAlert strokeWidth={2} size={24}/></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Selesai (Closed)</span>
            <span className="text-3xl font-black text-emerald-600 leading-none">{totalSelesai}</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0"><CheckCircle2 strokeWidth={2} size={24}/></div>
        </div>
      </div>

      {/* --- CONTROL PANEL & TABEL (HANYA MUNCUL BUAT GOD MODE / ADMIN) --- */}
      {isGodMode && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-hidden w-full sm:w-auto">
              <button onClick={() => { setViewMode('division'); setSelectedFilter('Semua'); setExpandedTaskId(null); setSearchQuery(''); }} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${viewMode === 'division' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}>By Division</button>
              <button onClick={() => { setViewMode('level'); setSelectedFilter('Semua'); setExpandedTaskId(null); setSearchQuery(''); }} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${viewMode === 'level' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}>By Aspek</button>
            </div>
            
            <button onClick={fetchData} className="w-full sm:w-auto flex justify-center items-center px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 uppercase tracking-widest shadow-sm bg-white transition-all active:scale-95 group">
              <RefreshCw className="w-4 h-4 mr-2 text-slate-400 group-hover:text-indigo-500 transition-transform group-active:rotate-180" strokeWidth={2.5}/> Sinkronisasi Data
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Layers size={16} className="text-indigo-500"/> Rekapitulasi {viewMode === 'division' ? 'Per Unit Kerja' : 'Per Aspek GCG'}
              </h2>
              <span className="hidden sm:inline-block text-[9px] text-slate-400 font-bold uppercase tracking-widest border border-slate-200 px-2 py-1 rounded bg-white">Klik Baris Tampil Rincian</span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              {viewMode === 'division' ? (
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-white text-slate-500 uppercase text-[10px] font-black tracking-wider border-b-2 border-slate-200">
                    <tr>
                      <th rowSpan={2} className="px-5 py-3 border-b border-r border-slate-200 text-center w-12">No</th>
                      <th rowSpan={2} className="px-5 py-3 border-b border-r border-slate-200">Unit Kerja Bisnis</th>
                      <th rowSpan={2} className="px-5 py-3 border-b border-r border-slate-200 text-center">Jml AOL</th>
                      <th colSpan={3} className="px-5 py-2 border-b border-r border-slate-200 text-center bg-indigo-50/50 text-indigo-700">Progres Tindak Lanjut</th>
                      <th rowSpan={2} className="px-5 py-3 border-b border-slate-200 text-center w-28">% Capaian</th>
                    </tr>
                    <tr className="bg-white">
                      <th className="px-4 py-2 border-b border-r border-slate-200 text-center text-emerald-600">Selesai</th>
                      <th className="px-4 py-2 border-b border-r border-slate-200 text-center text-indigo-600">Proses</th>
                      <th className="px-4 py-2 border-b border-r border-slate-200 text-center text-rose-600">Belum TL</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 text-xs">
                    {divisionData.map((item) => (
                      <tr key={item.name} className={`border-b border-slate-100 transition-colors cursor-pointer group ${selectedFilter === item.name ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`} onClick={() => setSelectedFilter(item.name === selectedFilter ? 'Semua' : item.name)}>
                        <td className={`px-5 py-3 text-center border-r border-slate-100 ${selectedFilter === item.name ? 'border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}`}>{item.no}</td>
                        <td className="px-5 py-3 font-bold border-r border-slate-100 text-slate-800 group-hover:text-indigo-600 transition-colors">{item.name}</td>
                        <td className="px-5 py-3 text-center border-r border-slate-100 font-black text-slate-900 bg-slate-50/50">{item.aol}</td>
                        <td className="px-5 py-3 text-center border-r border-slate-100 font-semibold">{item.selesai}</td>
                        <td className="px-5 py-3 text-center border-r border-slate-100 font-semibold">{item.proses}</td>
                        <td className="px-5 py-3 text-center border-r border-slate-100 font-semibold">{item.belum}</td>
                        <td className="px-5 py-3 text-center font-black text-indigo-600 bg-slate-50/50">{item.persen}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-widest">
                    <tr>
                      <td colSpan={2} className="px-5 py-4 text-right border-r border-slate-700">Total Keseluruhan</td>
                      <td className="px-5 py-4 text-center border-r border-slate-700 text-indigo-300 text-sm font-black">{totalAol}</td>
                      <td className="px-5 py-4 text-center border-r border-slate-700 text-emerald-400">{totalSelesai}</td>
                      <td className="px-5 py-4 text-center border-r border-slate-700 text-indigo-400">{totalProses}</td>
                      <td className="px-5 py-4 text-center border-r border-slate-700 text-rose-400">{totalBelum}</td>
                      <td className="px-5 py-4 text-center text-sm font-black text-emerald-400">{totalPersen}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <table className="w-full text-sm text-left border-collapse min-w-[800px]">
                  <thead className="bg-white text-slate-500 uppercase text-[10px] font-black tracking-wider border-b-2 border-slate-200">
                    <tr>
                      <th className="px-5 py-3 border-b border-r border-slate-200 w-[40%]">Aspek GCG</th>
                      <th className="px-5 py-3 border-b border-r border-slate-200 text-center w-24">Jumlah AOI</th>
                      <th colSpan={3} className="px-5 py-2 border-b border-slate-200 text-center bg-indigo-50/50 text-indigo-700">Status Tindak Lanjut</th>
                    </tr>
                    <tr className="bg-white">
                      <th className="border-r border-slate-200"></th>
                      <th className="border-r border-slate-200"></th>
                      <th className="px-4 py-2 border-b border-r border-slate-200 text-center text-rose-600">Belum TL</th>
                      <th className="px-4 py-2 border-b border-r border-slate-200 text-center text-indigo-600">Sedang Proses</th>
                      <th className="px-4 py-2 border-b border-slate-200 text-center text-emerald-600">Selesai</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 text-xs">
                    {levelData.map((item) => (
                      <tr key={item.name} className={`border-b border-slate-100 transition-colors cursor-pointer group ${selectedFilter === item.name ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`} onClick={() => setSelectedFilter(item.name === selectedFilter ? 'Semua' : item.name)}>
                        <td className={`px-5 py-3 font-bold border-r border-slate-100 text-slate-800 group-hover:text-indigo-600 transition-colors ${selectedFilter === item.name ? 'border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}`}>{item.name}</td>
                        <td className="px-5 py-3 text-center border-r border-slate-100 font-black text-slate-900 bg-slate-50/50">{item.aol}</td>
                        <td className="px-5 py-3 text-center border-r border-slate-100 font-semibold text-rose-600">{item.belum}</td>
                        <td className="px-5 py-3 text-center border-r border-slate-100 font-semibold text-indigo-600">{item.proses}</td>
                        <td className="px-5 py-3 text-center font-semibold text-emerald-600">{item.selesai}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-widest">
                    <tr>
                      <td className="px-5 py-4 text-right border-r border-slate-700">Total Keseluruhan</td>
                      <td className="px-5 py-4 text-center border-r border-slate-700 text-indigo-300 text-sm font-black">{totalAol}</td>
                      <td className="px-5 py-4 text-center border-r border-slate-700 text-rose-400">{totalBelum}</td>
                      <td className="px-5 py-4 text-center border-r border-slate-700 text-indigo-400">{totalProses}</td>
                      <td className="px-5 py-4 text-center text-sm font-black text-emerald-400">{totalSelesai}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- RINCIAN TUGAS (EXPANDABLE TABLE DATA DENGAN SEARCH) --- */}
      <div className={`mt-8 ${isGodMode ? 'pt-8 border-t border-slate-200' : ''}`}>
        
        {/* HEADER DENGAN SEARCH BAR */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-5">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Daftar Rincian Tindak Lanjut</h2>
            <p className="text-xs font-bold text-slate-500 mt-1">Status dan Aksi Area of Improvement (AOI)</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64 group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type="text"
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block pl-10 p-2.5 outline-none transition-all shadow-sm placeholder-slate-400"
                placeholder="Cari rincian / parameter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {selectedFilter !== 'Semua' && (
              <span className="w-full sm:w-auto bg-indigo-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex justify-between items-center gap-2 shadow-sm shrink-0">
                <span className="flex items-center gap-2 truncate"><Layers size={12} className="shrink-0"/> {selectedFilter}</span>
                <button onClick={() => { setSelectedFilter('Semua'); setSearchQuery(''); }} className="hover:bg-white/20 p-1 rounded-lg transition-colors border border-white/20 shrink-0"><XCircle size={14}/></button>
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {selectedFilter === 'Semua' && isGodMode && !searchQuery ? (
            <div className="p-16 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center mb-4"><Layers size={32} strokeWidth={2}/></div>
              <h3 className="text-base font-black text-slate-800 mb-1.5">Pilih Data Spesifik</h3>
              <p className="text-slate-500 font-medium text-xs max-w-sm">Klik salah satu Unit Kerja atau Aspek pada tabel di atas, atau gunakan kolom pencarian untuk melihat rincian.</p>
            </div>
          ) : 
          sortedTasks.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4"><ClipboardList size={32} strokeWidth={2}/></div>
              <h3 className="text-base font-black text-slate-800 mb-1.5">Tidak Ada Tugas Ditemukan</h3>
              <p className="text-slate-500 font-medium text-xs max-w-sm">
                {searchQuery ? 'Coba gunakan kata kunci pencarian yang lain.' : 'Belum ada rekomendasi tindak lanjut baru untuk area ini.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-5 py-4 w-12 text-center border-r border-slate-200">No</th>
                    <th className="px-5 py-4 border-r border-slate-200 w-1/4">Informasi AOI (Parameter)</th>
                    <th className="px-5 py-4 border-r border-slate-200 w-1/3">Rekomendasi</th>
                    <th className="px-5 py-4 border-r border-slate-200 w-40 text-center">Batas Waktu</th>
                    <th className="px-5 py-4 border-r border-slate-200 text-center w-32">Status</th>
                    <th className="px-5 py-4 text-center w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sortedTasks.map((task, idx) => {
                    const record = tlRecords[task.id] || { status: 'Open' };
                    const status = record.status;
                    const isOverdue = status === 'Open' && new Date(task.dueDate).getTime() < new Date().getTime();
                    
                    const isMyTask = task.picAuditor === user?.name || task.picAuditor === 'Sistem';
                    const canShowApprove = isGodMode || (isAnggota && isMyTask);
                    const isExpanded = expandedTaskId === task.id;

                    return (
                      <React.Fragment key={task.id}>
                        {/* MAIN ROW */}
                        <tr 
                          onClick={() => toggleExpand(task.id)} 
                          className={`group transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50/40 border-l-4 border-l-indigo-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                        >
                          <td className="px-5 py-4 text-center font-bold text-slate-400 border-r border-slate-100">{idx + 1}</td>
                          
                          {/* Info Parameter AOI */}
                          <td className="px-5 py-4 border-r border-slate-100 max-w-[200px] truncate">
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest truncate">{task.aspek}</span>
                              <p className="font-bold text-slate-800 truncate" title={task.parameterName}>{task.parameterName}</p>
                              {!isAuditee && (
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mt-0.5"><Layers size={10}/> {task.picDivisi}</span>
                              )}
                            </div>
                          </td>

                          {/* Info Rekomendasi (Truncated) */}
                          <td className="px-5 py-4 border-r border-slate-100 max-w-[250px] truncate">
                            <p className="text-xs font-semibold text-slate-600 truncate" title={task.recommendation}>{task.recommendation}</p>
                          </td>

                          {/* Info Batas Waktu */}
                          <td className="px-5 py-4 text-center border-r border-slate-100">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border ${isOverdue ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                              <Clock size={12}/> {task.dueDate}
                            </div>
                          </td>

                          {/* Badge Status */}
                          <td className="px-5 py-4 text-center border-r border-slate-100">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${getStatusColor(status)}`}>
                              {status === 'Open' && <AlertTriangle size={10}/>}
                              {status === 'Closed' && <CheckCircle2 size={10}/>}
                              {status === 'In Progress' && <Clock size={10}/>}
                              {status === 'Submitted' && <Upload size={10}/>}
                              {status === 'Rejected' && <XCircle size={10}/>}
                              {status}
                            </span>
                          </td>

                          {/* Expand Button */}
                          <td className="px-5 py-4 text-center">
                            <button className={`p-1.5 rounded-lg transition-all border ${isExpanded ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border-slate-200'}`}>
                              {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                            </button>
                          </td>
                        </tr>

                        {/* EXPANDED ACTION ROW (Panel Form & Detail) */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50 border-b border-slate-200">
                            <td colSpan={6} className="p-0 whitespace-normal">
                              <div className="p-6 md:p-8 animate-in slide-in-from-top-2 duration-200">
                                
                                <div className="flex flex-col lg:flex-row gap-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                  
                                  {/* Kiri: Teks Lengkap */}
                                  <div className="p-6 lg:w-3/5 border-b lg:border-b-0 lg:border-r border-slate-100">
                                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">Parameter Penilaian</h4>
                                    <p className="text-sm font-bold text-slate-800 leading-relaxed mb-5">{task.parameterName}</p>

                                    <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1.5">Rekomendasi Tindak Lanjut</h4>
                                    <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 text-sm font-semibold text-slate-700 leading-relaxed shadow-sm">
                                      {task.recommendation}
                                    </div>

                                    {status === 'Rejected' && record.auditorNote && (
                                      <div className="mt-4 bg-rose-50 border border-rose-200 p-4 rounded-xl flex gap-3 text-rose-700">
                                        <XCircle className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={2.5}/>
                                        <div>
                                          <p className="text-[10px] font-black uppercase tracking-widest mb-0.5 text-rose-500">Ditolak Auditor (Perlu Revisi)</p>
                                          <p className="text-xs font-bold">{record.auditorNote}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Kanan: Panel Aksi Dinamis */}
                                  <div className="p-6 lg:w-2/5 bg-slate-50 flex flex-col justify-center">
                                    
                                    {(status === 'Open' || status === 'Rejected') && isAuditee && (
                                      <div className="text-center">
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-300 mx-auto shadow-sm mb-3 border border-slate-200"><ClipboardList size={20} strokeWidth={2}/></div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest">Tindakan Diperlukan</p>
                                        <button onClick={() => handleStartProgress(task)} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-[11px] active:scale-95 uppercase tracking-widest">
                                          Proses Tindak Lanjut
                                        </button>
                                      </div>
                                    )}

                                    {(status === 'Open' || status === 'Rejected') && !isAuditee && (
                                      <div className="text-center text-slate-400">
                                        <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" strokeWidth={1.5} />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Menunggu PIC Divisi</p>
                                      </div>
                                    )}

                                    {status === 'In Progress' && isAuditee && (
                                      <div>
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div> Upload Bukti TL</p>
                                        
                                        <label className="flex items-center justify-center w-full bg-white border border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 font-bold py-2.5 rounded-xl cursor-pointer text-[10px] uppercase tracking-widest transition-colors mb-3 shadow-sm">
                                          <Upload size={14} className="mr-1.5"/> {selectedFile ? 'Ganti Dokumen' : 'Pilih File (PDF/XLS)'}
                                          <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf, .xls, .xlsx" />
                                        </label>
                                        {selectedFile && <p className="text-[10px] font-bold text-indigo-500 mb-3 truncate bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm text-center">{selectedFile.name}</p>}
                                        
                                        <textarea className="w-full text-xs p-3.5 mb-4 border border-slate-300 rounded-xl bg-white focus:border-indigo-400 outline-none resize-none shadow-sm transition-colors" rows={2} placeholder="Keterangan opsional..." value={inputNotes[task.id] || ''} onChange={(e) => setInputNotes({...inputNotes, [task.id]: e.target.value})} />
                                        
                                        <button onClick={() => handleSubmitTindakLanjut(task)} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-[11px] flex items-center justify-center gap-1.5 active:scale-95 uppercase tracking-widest">
                                          Kirim Verifikasi <CheckCircle2 size={14} strokeWidth={2.5}/>
                                        </button>
                                      </div>
                                    )}

                                    {status === 'In Progress' && !isAuditee && (
                                      <div className="text-center text-amber-600">
                                        <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" strokeWidth={1.5} />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Proses Evaluasi PIC</p>
                                      </div>
                                    )}

                                    {status === 'Submitted' && (
                                      <div className="flex flex-col h-full justify-center text-center">
                                        <div className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest mb-4 mx-auto border border-indigo-200">Menunggu Verifikasi</div>
                                        
                                        {record.auditeeNote && (
                                          <div className="bg-white p-3.5 rounded-xl text-[10px] text-slate-600 border border-slate-200 text-left mb-4 shadow-sm">
                                            <span className="font-bold text-slate-400 uppercase tracking-widest block mb-1">Catatan:</span><span className="font-semibold text-slate-700">"{record.auditeeNote}"</span>
                                          </div>
                                        )}
                                        
                                        <button onClick={() => setViewingDoc({url: record.fileUrl!, name: record.fileName!})} className="w-full bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-xl hover:text-indigo-600 hover:border-indigo-300 transition-colors text-[11px] mb-4 flex items-center justify-center gap-1.5 uppercase tracking-widest shadow-sm">
                                          <FileText size={16} strokeWidth={2}/> Tinjau Bukti
                                        </button>

                                        {canShowApprove ? (
                                          rejectingId === task.id ? (
                                            <div className="space-y-3 bg-rose-50 p-3.5 rounded-xl border border-rose-200">
                                              <input type="text" placeholder="Alasan penolakan..." value={rejectNote} onChange={e => setRejectNote(e.target.value)} className="w-full text-xs p-2.5 font-semibold border border-rose-300 rounded-lg outline-none focus:border-rose-500 bg-white" />
                                              <div className="flex gap-2">
                                                <button onClick={() => handleRejectTindakLanjut(task)} className="flex-1 bg-rose-600 text-white text-[10px] uppercase tracking-widest font-bold py-2.5 rounded-lg active:scale-95 shadow-sm">Kirim</button>
                                                <button onClick={() => setRejectingId(null)} className="px-4 bg-white text-slate-600 border border-slate-300 text-[10px] uppercase tracking-widest font-bold py-2.5 rounded-lg hover:bg-slate-100">Batal</button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex gap-3">
                                              <button onClick={() => handleVerifyTindakLanjut(task)} className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition-colors text-[11px] uppercase tracking-widest shadow-sm flex items-center justify-center gap-1.5 active:scale-95">
                                                <CheckSquare size={16} strokeWidth={2.5}/> Setujui
                                              </button>
                                              <button onClick={() => setRejectingId(task.id)} className="px-5 bg-white border border-rose-200 text-rose-600 font-bold py-3 rounded-xl hover:bg-rose-50 transition-colors text-[11px] uppercase tracking-widest shadow-sm">
                                                Tolak
                                              </button>
                                            </div>
                                          )
                                        ) : !isAuditee ? (
                                          <div className="bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl mt-2 inline-block mx-auto">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ShieldAlert size={12}/> Akses Auditor</p>
                                          </div>
                                        ) : null}
                                      </div>
                                    )}

                                    {status === 'Closed' && (
                                      <div className="text-center flex flex-col justify-center py-4">
                                        <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" strokeWidth={2} />
                                        <p className="text-[11px] font-black text-emerald-600 uppercase mb-4 tracking-widest">Tugas Selesai</p>
                                        <button onClick={() => setViewingDoc({url: record.fileUrl!, name: record.fileName!})} className="w-full bg-white border border-emerald-200 text-emerald-700 font-bold py-3 rounded-xl hover:bg-emerald-50 transition-colors text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"><Eye size={16} strokeWidth={2.5}/> Lihat Bukti Arsip</button>
                                      </div>
                                    )}
                                    
                                  </div>
                                </div>
                                
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* PDF VIEWER MODAL */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-[0.98] duration-200 border border-slate-200">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0 relative z-10">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg"><FileText size={20} className="text-indigo-400" strokeWidth={2}/></div>
                <div>
                  <h2 className="text-sm font-bold tracking-wide truncate max-w-lg leading-tight uppercase">{viewingDoc.name}</h2>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest">Arsip Bukti Dokumen TL</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <a href={viewingDoc.url.replace(/^http:\/\//i, 'https://')} target="_blank" download className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 transition-colors active:scale-95 border border-indigo-500">
                  <Download size={14} strokeWidth={2.5}/> Unduh Asli
                </a>
                <button onClick={() => setViewingDoc(null)} className="p-2 bg-slate-800 hover:bg-rose-500 hover:text-white rounded-lg transition-colors active:scale-95 text-slate-300">
                  <XCircle size={18} strokeWidth={2.5}/>
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center p-2">
               {viewingDoc.url && viewingDoc.url.endsWith('.pdf') ? (
                 <iframe src={viewingDoc.url.replace(/^http:\/\//i, 'https://')} title={viewingDoc.name} className="w-full h-full border-none rounded-xl bg-white shadow-sm"/>
               ) : (
                 <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={40} className="text-slate-300" strokeWidth={1.5} /></div>
                   <h3 className="text-base font-bold text-slate-800 mb-2 truncate w-full px-4">{viewingDoc.name}</h3>
                   <p className="text-slate-500 text-xs font-medium mb-6">Pratinjau langsung hanya didukung untuk format dokumen PDF. Silakan unduh untuk melihat konten selengkapnya.</p>
                   {viewingDoc.url && (
                    <a href={viewingDoc.url.replace(/^http:\/\//i, 'https://')} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors hover:bg-indigo-700 active:scale-95 flex items-center gap-2 shadow-sm">
                      <Download size={16} strokeWidth={2.5}/> Download File
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