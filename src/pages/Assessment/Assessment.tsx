import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Award, Users, ShieldCheck, Briefcase, Megaphone, MoreHorizontal, ChevronRight, Plus, X, ArrowLeft, Trash2, Edit3, Save, Layers, Lock, CheckCircle2 } from 'lucide-react';
import KertasKerja from './KertasKerja';
import type { EvidenceFile, DocumentRequest, User } from '../../types';
import type { MasterAspect } from '../../data/masterIndicators';

interface AssessmentProps { 
  evidences: EvidenceFile[]; 
  setEvidences: React.Dispatch<React.SetStateAction<EvidenceFile[]>>;
  documentRequests: DocumentRequest[];
  setDocumentRequests: React.Dispatch<React.SetStateAction<DocumentRequest[]>>;
}

interface Member { name: string; aspectId: string; }
interface AssessmentItem { id: string; year: string; tb: string; noSt?: string; pt: string; kt: string; members: Member[]; createdAt: string; createdBy: string; status: string; data: Record<string, any>; }
interface FormData { id: string | null; year: string; tb: string; noSt: string; pt: string; kt: string; members: Member[]; }

const ASPECT_COLORS = [
  'text-rose-600 bg-rose-50', 'text-indigo-600 bg-indigo-50', 
  'text-emerald-600 bg-emerald-50', 'text-violet-600 bg-violet-50', 
  'text-cyan-600 bg-cyan-50', 'text-amber-600 bg-amber-50'
];
const ASPECT_ICONS = [Award, Users, ShieldCheck, Briefcase, Megaphone, MoreHorizontal];

export default function Assessment({ evidences, setEvidences, documentRequests, setDocumentRequests }: AssessmentProps) {
  const { user } = useAuth();
  
  // Role Access
  const isLeader = user?.role === 'auditor' && (user?.level === 'Pengendali Teknis' || user?.level === 'Ketua Tim');
  const canCreateAssessment = isLeader;

  // States
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [masterData, setMasterData] = useState<MasterAspect[]>([]);
  const [auditors, setAuditors] = useState<User[]>([]);
  
  // Navigation States (Mengembalikan Flow Lama)
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [selectedAspect, setSelectedAspect] = useState<MasterAspect | null>(null);
  
  // Form States
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FormData>({ id: null, year: new Date().getFullYear().toString(), tb: '', noSt: '', pt: '', kt: '', members: [{ name: '', aspectId: '' }] });
  
  

  useEffect(() => {
    const fetchData = async () => {
      const headers = {  'Accept': 'application/json' };

      // Load Master Data
      try {
        const resMaster = await fetchApi('/master-indicators', { headers });
        if (resMaster.ok) {
          const mData = await resMaster.json();
          setMasterData(mData);
          if (mData.length > 0 && !form.members[0].aspectId) {
            setForm(prev => ({ ...prev, members: [{ name: '', aspectId: mData[0].id }] }));
          }
        }
      } catch (err) { console.error("Gagal load Master Data", err); }

      // Load Auditors
      try {
        const resUsers = await fetchApi('/auditors', { headers });
        if (resUsers.ok) {
          const usersData = await resUsers.json();
          setAuditors(Array.isArray(usersData) ? usersData : (usersData?.data || [])); 
        }
      } catch (err) { console.error("Gagal load Auditors", err); }

      fetchAssessments();
    };
    
    fetchData();
  }, []);

  const fetchAssessments = async () => {
    try {
      const res = await fetchApi('/assessments', { 
        });
      if (res.ok) setAssessments(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasEmptyMapping = form.members.some(m => !m.name || !m.aspectId);
    if(hasEmptyMapping) return alert("Pilih Auditor dan Aspek untuk semua mapping!");

    const headers = {  'Content-Type': 'application/json', 'Accept': 'application/json' };

    try {
      if (isEditing && form.id) {
        const res = await fetchApi('/assessments/${form.id}', { method: 'PUT', headers, body: JSON.stringify(form) });
        if (res.ok) fetchAssessments();
      } else {
        // Rakit Snapshot dari Master Data (Sama seperti versi API sebelumnya)
        const initialData: Record<string, any> = {};
        masterData.forEach(aspect => {
          initialData[aspect.id] = aspect.indicators.map(ind => ({
            id: ind.id, indicatorName: ind.name, bobot: ind.bobot || 0, indicatorScore: 0, aspectScore: 0,
            parameters: ind.parameters.map(param => ({
              id: param.id, parameterName: param.name, bobot: param.bobot || 0, parameterScore: 0, fulfillment: 0,
              factors: param.factors.map(fac => ({
                id: fac.id, name: fac.name, description: '', factorScore: 0, recommendation: '',
                subFactors: fac.subFactors ? fac.subFactors.map(sub => ({ id: sub.id, name: sub.name, description: sub.description || '', isFulfilled: false })) : []
              }))
            }))
          }));
        });

        const newAssessment = { ...form, id: `ASSESS-${Date.now()}`, data: initialData };
        const res = await fetchApi('/assessments', { method: 'POST', headers, body: JSON.stringify(newAssessment) });
        if (res.ok) fetchAssessments();
      }
      closeModal();
    } catch (err) {
      alert('Gagal menyimpan ke server.');
    }
  };

  const deleteTb = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Yakin ingin menghapus assessment ini secara permanen? Seluruh Kertas Kerja di dalamnya akan hilang.")) {
      try {
        const res = await fetchApi(`/assessments/${id}`, { method: 'DELETE', });
        if (res.ok) fetchAssessments();
      } catch (err) { alert('Gagal menghapus.'); }
    }
  };

  const openEditModal = (e: React.MouseEvent, item: AssessmentItem) => { e.stopPropagation(); setForm({ id: item.id, year: item.year, tb: item.tb, noSt: item.noSt || '', pt: item.pt, kt: item.kt, members: [...item.members] }); setIsEditing(true); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setIsEditing(false); setForm({ id: null, year: new Date().getFullYear().toString(), tb: '', noSt: '', pt: '', kt: '', members: [{ name: '', aspectId: masterData[0]?.id || '' }] }); };

  const activeAssessment = assessments.find(a => a.id === activeAssessmentId);

  // MENGHITUNG PROGRESS BAR
  const calculateProgress = (aspectId: string, aspectBobot: number) => {
    if (!activeAssessment || !activeAssessment.data || !activeAssessment.data[aspectId] || aspectBobot === 0) return 0;
    const aspectData = activeAssessment.data[aspectId];
    let totalScore = 0;
    aspectData.forEach((ind: any) => { totalScore += (ind.indicatorScore || 0); });
    const percent = (totalScore / aspectBobot) * 100;
    return Math.min(percent, 100).toFixed(1);
  };

  // FINALISASI ASSESSMENT KESELURUHAN
  const handleFinalizeAssessment = async () => {
    if (!activeAssessmentId) return;
    if (window.confirm("Anda yakin ingin Kunci & Finalisasi Assessment ini?\n\nPerhatian: Setelah difinalisasi, status akan menjadi 'Selesai' dan seluruh Kertas Kerja akan dikunci permanen (Read-Only) bagi semua anggota tim.")) {
      try {
        const res = await fetchApi('/assessments/${activeAssessmentId}/data', {
          method: 'PUT', headers: {  'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Selesai' })
        });
        if (res.ok) { alert("Assessment berhasil dikunci!"); fetchAssessments(); }
      } catch (error) { alert("Gagal mengunci assessment."); }
    }
  };

  // SMART STATUS (Ganti dari Draft -> Proses otomatis saat kertas kerja diklik/disimpan)
  const handleInteraction = async () => {
    if (activeAssessment && activeAssessment.status === 'Draft') {
      try {
        await fetchApi('/assessments/${activeAssessment.id}/data', {
          method: 'PUT', headers: {  'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Proses' })
        });
        fetchAssessments();
      } catch (e) { console.error(e) }
    }
  };

  // SAVE KERTAS KERJA PER ASPEK KE API
  const handleSaveKertasKerjaData = async (newData: Record<string, any>) => {
    if (!activeAssessment) return;
    // Local state update biar UI instant
    const updatedAssessments = assessments.map(a => a.id === activeAssessment.id ? { ...a, data: newData } : a);
    setAssessments(updatedAssessments);
    
    // Push ke backend
    try {
      await fetchApi('/assessments/${activeAssessment.id}/data', {
        method: 'PUT', headers: {  'Content-Type': 'application/json' },
        body: JSON.stringify({ data: newData })
      });
    } catch (e) { alert("Gagal menyimpan Kertas Kerja ke server."); }
  };

  const visibleAssessments = assessments.filter(a => { if (user?.role !== "auditor") return true; return a.members.some(m => m.name === user?.name) || isLeader; });

  // === RENDER 3: HALAMAN DALAM KERTAS KERJA (ASPEK SPECIFIC) ===
  if (selectedAspect && activeAssessment) {
    const aspectIndex = masterData.findIndex(a => a.id === selectedAspect.id);
    const aspectIcon = ASPECT_ICONS[aspectIndex % ASPECT_ICONS.length] || Layers;
    const aspectColor = ASPECT_COLORS[aspectIndex % ASPECT_COLORS.length];

    const currentPic = activeAssessment.members?.find(m => m.aspectId === selectedAspect.id);
    const isPICForThisAspect = currentPic?.name === user?.name;
    const isCompleted = activeAssessment.status === 'Selesai' || activeAssessment.status === 'Completed';
    const isReadOnly = isCompleted || (isLeader && !isPICForThisAspect);

    return (
      <KertasKerja 
        assessmentId={activeAssessment.id} 
        assessmentYear={activeAssessment.year} 
        aspect={{ id: selectedAspect.id, name: selectedAspect.name, icon: aspectIcon, color: aspectColor }} 
        masterAspectBobot={selectedAspect.bobot || 0} 
        onBack={() => setSelectedAspect(null)} 
        assessmentData={activeAssessment.data || {}}
        setAssessmentData={handleSaveKertasKerjaData} // Gunakan fungsi API
        evidences={evidences}
        setEvidences={setEvidences} 
        documentRequests={documentRequests} 
        setDocumentRequests={setDocumentRequests} 
        isReadOnly={isReadOnly} 
        onInteraction={handleInteraction} 
      />
    );
  }

  // === RENDER 2: HALAMAN DETAIL ASSESSMENT (GRID ASPEK) ===
  if (activeAssessmentId && activeAssessment) {
    const isCompleted = activeAssessment.status === 'Selesai' || activeAssessment.status === 'Completed';
    const isProses = activeAssessment.status === 'Proses' || activeAssessment.status === 'Assessment';

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 text-left w-full min-w-0 pb-10 max-w-7xl mx-auto">
        <button onClick={() => setActiveAssessmentId(null)} className="flex items-center space-x-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm transition-all active:scale-95 text-xs tracking-widest uppercase">
          <ArrowLeft size={16} strokeWidth={2.5}/> <span>KEMBALI KE DAFTAR</span>
        </button>
        
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-8 md:p-10 rounded-3xl shadow-xl shadow-indigo-200 flex flex-col md:flex-row md:justify-between md:items-center text-white relative overflow-hidden gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 blur-3xl rounded-full -mr-40 -mt-40 pointer-events-none"></div>
          <div className="z-10 bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-1">Assessment GCG {activeAssessment.year}</h1>
              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm border ${isCompleted ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : isProses ? 'bg-indigo-500/30 border-indigo-400/50 text-indigo-300' : 'bg-amber-500/20 border-amber-500/50 text-amber-300'}`}>
                {isCompleted && <CheckCircle2 size={14} strokeWidth={3}/>}
                {isProses && <Layers size={14} strokeWidth={3}/>}
                {!isCompleted && !isProses && <ShieldCheck size={14} strokeWidth={3}/>}
                {activeAssessment.status}
              </span>
            </div>
            <p className="text-indigo-200 text-[11px] font-black mt-3 tracking-widest uppercase bg-black/20 inline-block px-3 py-1.5 rounded-lg border border-white/10">Surat Tugas: {activeAssessment.tb} | No ST: {activeAssessment.noSt || '-'}</p>
          </div>

          {isLeader && !isCompleted && (
            <button 
              onClick={handleFinalizeAssessment}
              className="z-10 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-emerald-500/30 flex items-center gap-3 transition-transform transform active:scale-95 border border-emerald-400"
            >
              <Lock size={18} strokeWidth={3}/> Kunci & Finalisasi
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {masterData.map((aspect, index) => {
            const pic = activeAssessment.members?.find(m => m.aspectId === aspect.id);
            const isPICForThisAspect = pic?.name === user?.name;
            const canAccess = isPICForThisAspect || isLeader; 
            
            if (user?.role === 'auditor' && !canAccess) return null; 
            
            const Icon = ASPECT_ICONS[index % ASPECT_ICONS.length] || Layers;
            const colorClass = ASPECT_COLORS[index % ASPECT_COLORS.length];
            const aspectBobot = Number(aspect.bobot || 0);
            const progress = calculateProgress(aspect.id, aspectBobot);

            return (
              <div key={aspect.id} onClick={() => canAccess ? setSelectedAspect(aspect) : null} className={`group bg-white p-6 border rounded-3xl transition-all duration-300 relative shadow-sm hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-100 cursor-pointer overflow-hidden ${isLeader && !isPICForThisAspect ? 'border-slate-200 opacity-90' : 'border-slate-100'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className={`p-4 rounded-2xl ${colorClass} shadow-sm group-hover:scale-110 transition-transform duration-300`}><Icon size={28} strokeWidth={2.5}/></div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 px-2 py-0.5 rounded-md inline-block">Bobot Penilaian</p>
                    <p className="text-3xl font-black text-slate-800 leading-none mt-2">{aspectBobot.toFixed(3)}</p>
                  </div>
                </div>
                
                <h3 className="text-lg font-black text-slate-800 mb-6 uppercase leading-tight group-hover:text-indigo-600 transition-colors relative z-10 line-clamp-2 h-11">{aspect.id} - {aspect.name}</h3>
                
                <div className="pt-5 border-t border-slate-100 flex items-center justify-between mb-5 relative z-10 bg-slate-50 p-4 rounded-2xl group-hover:bg-indigo-50/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[12px] font-black text-indigo-500 uppercase border border-slate-200 shadow-sm">{pic?.name?.charAt(0) || "?"}</div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">PIC Auditor</p>
                      <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{pic?.name || "Unassigned"}</p>
                    </div>
                  </div>
                  {isLeader && !isPICForThisAspect && <span className="text-[8px] font-black bg-white text-rose-500 border border-rose-100 px-2 py-1.5 rounded-lg uppercase tracking-widest shadow-sm"><Lock size={10} className="inline mr-1 -mt-0.5"/> Read-Only</span>}
                </div>

                <div className="relative z-10">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest mb-2.5">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50">
                    <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // === RENDER 1: HALAMAN UTAMA HISTORY (LIST) ===
  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left w-full min-w-0 pb-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Timeline Penilaian</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">Daftar Assessment GCG per Tahun Buku & Surat Tugas</p>
        </div>
        {canCreateAssessment && (
          <button onClick={() => setShowModal(true)} className="relative z-10 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4.5 rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/30 active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 group overflow-hidden">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none"></div>
            <Plus size={18} strokeWidth={3} className="relative z-10" /> <span className="relative z-10">Mulai Assessment Baru</span>
          </button>
        )}
      </div>

      {visibleAssessments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleAssessments.map((item) => {
            const isCompleted = item.status === 'Selesai' || item.status === 'Completed';
            const isProses = item.status === 'Proses' || item.status === 'Assessment';

            return (
            <div key={item.id} onClick={() => setActiveAssessmentId(item.id)} className="bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-xl hover:shadow-indigo-100 hover:border-indigo-300 transition-all duration-300 cursor-pointer relative group flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : isProses ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {item.status}
                </span>
                {canCreateAssessment && !isCompleted && (
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 p-1 rounded-xl border border-slate-100">
                    <button onClick={(e) => openEditModal(e, item)} className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-indigo-100 shadow-sm"><Edit3 size={14} strokeWidth={2.5}/></button>
                    <button onClick={(e) => deleteTb(e, item.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-rose-100 shadow-sm"><Trash2 size={14} strokeWidth={2.5}/></button>
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Megaphone size={12}/> Pelaksanaan GCG</p>
                <h3 className="text-2xl font-black text-slate-800 leading-none group-hover:text-indigo-600 transition-colors">Tahun Buku {item.year}</h3>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-4 mb-2 border border-slate-100/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Surat Tugas</p>
                <p className="text-xs font-bold text-slate-700">{item.tb}</p>
                {item.noSt && <p className="text-[10px] font-bold text-indigo-600 mt-2 bg-indigo-50 px-2.5 py-1 rounded inline-block uppercase tracking-wider border border-indigo-100">{item.noSt}</p>}
              </div>
              
              <div className="border-t border-slate-100 pt-5 mt-auto flex justify-between items-end">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ketua Tim / PT :</p>
                  <p className="text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded w-max border border-slate-200 flex items-center gap-1.5"><ShieldCheck size={12} className="text-slate-500"/> {item.pt}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 transition-transform group-hover:-translate-y-1">
                  <ChevronRight size={16} strokeWidth={3}/>
                </div>
              </div>
            </div>
          )})}
        </div>
      ) : (
         <div className="p-16 text-center bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
            <div className="w-24 h-24 bg-slate-50 flex items-center justify-center rounded-full mb-6">
              <Megaphone size={40} className="text-slate-300" strokeWidth={1.5}/>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Belum ada Assessment</h3>
            <p className="text-slate-500 font-medium text-sm">Silakan buat assessment baru untuk memulai evaluasi GCG.</p>
         </div>
      )}

      {/* FORM MODAL - GLASSMORPHISM UI */}
      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-[0.97] duration-300 relative flex flex-col max-h-[90vh]">
            
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white/50 relative z-10 shrink-0">
              <h2 className="font-black text-xl text-slate-800 flex items-center gap-3 tracking-tight">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  {isEditing ? <Edit3 size={20} strokeWidth={2.5}/> : <Plus size={20} strokeWidth={2.5}/>}
                </div>
                {isEditing ? 'Data Assessment' : 'Setup Penilaian Baru'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:bg-slate-100 hover:text-slate-700 p-2 rounded-xl transition-colors active:scale-90 bg-slate-50 border border-slate-100"><X size={20} strokeWidth={2.5}/></button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar flex-1 relative z-10 bg-white">
              <form onSubmit={handleSave} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2"><Briefcase size={14} strokeWidth={3}/> Administrasi Surat Tugas</h4>
                  
                  <div className="grid grid-cols-2 gap-5">
                    <div className="group">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Tahun Buku</label>
                      <input required type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-slate-700 text-sm" />
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Tanggal Buku</label>
                      <input required type="date" value={form.tb} onChange={e => setForm({...form, tb: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-slate-700 cursor-pointer text-sm" />
                    </div>
                  </div>
                  
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Nomor Surat Tugas</label>
                    <input required value={form.noSt} onChange={e => setForm({...form, noSt: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-slate-700 text-sm" />
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Pengendali Teknis</label>
                    <input required value={form.pt} onChange={e => setForm({...form, pt: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-slate-700 text-sm" />
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Ketua Tim</label>
                    <input required value={form.kt} onChange={e => setForm({...form, kt: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-slate-700 text-sm" />
                  </div>
                </div>

                <div className="space-y-6 flex flex-col h-full">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Users size={14} strokeWidth={3}/> Mapping Auditor Aspek</h4>
                    <button type="button" onClick={() => setForm({...form, members: [...form.members, {name: "", aspectId: masterData[0]?.id || ""}]})} className="text-[10px] font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100/50 flex items-center gap-1"><Plus size={12} strokeWidth={3}/> TAMBAH</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar min-h-[300px] border border-slate-100 p-4 rounded-2xl bg-slate-50/50">
                    {form.members.map((m, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative">
                        <div className="flex-1 space-y-3">
                          <select required className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 hover:bg-white cursor-pointer transition-all" value={m.name} onChange={e => { const updated = [...form.members]; updated[idx].name = e.target.value; setForm({...form, members: updated}); }}>
                            <option value="" disabled>-- Pilih Auditor --</option>
                            {auditors.map(a => (<option key={a.id} value={a.name}>{a.name}</option>))}
                          </select>
                          <select required className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 hover:bg-white cursor-pointer transition-all" value={m.aspectId} onChange={e => { const updated = [...form.members]; updated[idx].aspectId = e.target.value; setForm({...form, members: updated}); }}>
                            <option value="" disabled>-- Pilih Aspek --</option>
                            {masterData.map(a => <option key={a.id} value={a.id}>{a.id} - {a.name}</option>)}
                          </select>
                        </div>
                        {form.members.length > 1 && (
                          <button type="button" onClick={() => setForm({...form, members: form.members.filter((_, i) => i !== idx)})} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors border border-transparent hover:border-rose-100 shrink-0 self-center">
                            <Trash2 size={16} strokeWidth={2.5}/>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100 mt-auto">
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-transform active:scale-95 shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 group overflow-hidden relative">
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none"></div>
                      <Save size={16} strokeWidth={3} className="relative z-10"/> <span className="relative z-10">{isEditing ? 'Simpan Data Assessment' : 'Simpan Entry Assessment'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}