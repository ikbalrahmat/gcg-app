import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Award, Users, ShieldCheck, Briefcase, Megaphone, MoreHorizontal, ChevronRight, ChevronLeft, ChevronDown, Plus, X, ArrowLeft, Trash2, Edit3, Save, Layers, Lock, CheckCircle2, RefreshCw, AlertTriangle, Search, Filter, LayoutGrid, List, Target } from 'lucide-react';
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
  'text-rose-600 bg-rose-50 border-rose-100', 'text-indigo-600 bg-indigo-50 border-indigo-100',
  'text-emerald-600 bg-emerald-50 border-emerald-100', 'text-violet-600 bg-violet-50 border-violet-100',
  'text-cyan-600 bg-cyan-50 border-cyan-100', 'text-amber-600 bg-amber-50 border-amber-100'
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
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Navigation States
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [selectedAspect, setSelectedAspect] = useState<MasterAspect | null>(null);

  // Filter, View & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form States
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FormData>({ id: null, year: new Date().getFullYear().toString(), tb: '', noSt: '', pt: '', kt: '', members: [{ name: '', aspectId: '' }] });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsSyncing(true);
      const headers = { 'Accept': 'application/json' };

      try {
        const resMaster = await fetchApi('/master-indicators', { headers });
        if (resMaster.ok) {
          const mData = await resMaster.json();
          setMasterData(mData);
          if (mData.length > 0 && !form.members[0].aspectId) {
            setForm(prev => ({ ...prev, members: [{ name: '', aspectId: mData[0].id }] }));
          }
        }
        
        const resUsers = await fetchApi('/auditors', { headers });
        if (resUsers.ok) {
          const usersData = await resUsers.json();
          setAuditors(Array.isArray(usersData) ? usersData : (usersData?.data || []));
        }

        await fetchAssessments(); 
      } catch (err) { 
        console.error("Gagal load data", err); 
      } finally {
        setTimeout(() => setIsSyncing(false), 500); 
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, itemsPerPage]);

  const fetchAssessments = async () => {
    try {
      const res = await fetchApi('/assessments', {});
      if (res.ok) setAssessments(await res.json());
    } catch (err) { 
      console.error(err); 
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasEmptyMapping = form.members.some(m => !m.name || !m.aspectId);
    if (hasEmptyMapping) return showNotification('error', "Pilih Auditor dan Aspek untuk semua mapping!");

    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };

    try {
      if (isEditing && form.id) {
        const res = await fetchApi(`/assessments/${form.id}`, { method: 'PUT', headers, body: JSON.stringify(form) });
        if (res.ok) {
          await fetchAssessments();
          showNotification('success', 'Assessment berhasil diperbarui!');
        } else throw new Error();
      } else {
        const initialData: Record<string, any> = {};
        masterData.forEach(aspect => {
          initialData[aspect.id] = aspect.indicators.map(ind => ({
            id: ind.id, indicatorName: ind.name, bobot: ind.bobot || 0, indicatorScore: 0, aspectScore: 0,
            parameters: ind.parameters.map(param => ({
              id: param.id, parameterName: param.name, bobot: param.bobot || 0, parameterScore: 0, fulfillment: 0,
              factors: param.factors.map(fac => ({
                id: fac.id, name: fac.name, description: '', factorScore: 0, recommendation: '',
                subFactors: fac.subFactors ? fac.subFactors.map(sub => ({ id: sub.id, name: sub.name, description: sub.description || '', subFactorScore: 0 })) : []
              }))
            }))
          }));
        });

        const newAssessment = { ...form, id: `ASSESS-${Date.now()}`, data: initialData };
        const res = await fetchApi('/assessments', { method: 'POST', headers, body: JSON.stringify(newAssessment) });
        if (res.ok) {
          await fetchAssessments();
          showNotification('success', 'Assessment baru berhasil dibuat!');
        } else throw new Error();
      }
      closeModal();
    } catch (err) {
      showNotification('error', 'Gagal menyimpan data ke server!');
    }
  };

  const deleteTb = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Yakin ingin menghapus assessment ini secara permanen? Seluruh Kertas Kerja di dalamnya akan hilang.")) {
      try {
        const res = await fetchApi(`/assessments/${id}`, { method: 'DELETE', });
        if (res.ok) {
          await fetchAssessments();
          showNotification('success', 'Assessment berhasil dihapus!');
        } else throw new Error();
      } catch (err) { 
        showNotification('error', 'Gagal menghapus assessment dari server!');
      }
    }
  };

  const openEditModal = (e: React.MouseEvent, item: AssessmentItem) => { e.stopPropagation(); setForm({ id: item.id, year: item.year, tb: item.tb, noSt: item.noSt || '', pt: item.pt, kt: item.kt, members: [...item.members] }); setIsEditing(true); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setIsEditing(false); setForm({ id: null, year: new Date().getFullYear().toString(), tb: '', noSt: '', pt: '', kt: '', members: [{ name: '', aspectId: masterData[0]?.id || '' }] }); };

  const activeAssessment = assessments.find(a => a.id === activeAssessmentId);

  const calculateProgress = (aspectId: string, aspectBobot: number) => {
    if (!activeAssessment || !activeAssessment.data || !activeAssessment.data[aspectId] || aspectBobot === 0) return 0;
    const aspectData = activeAssessment.data[aspectId];
    let totalScore = 0;
    aspectData.forEach((ind: any) => { totalScore += (ind.indicatorScore || 0); });
    const percent = (totalScore / aspectBobot) * 100;
    return Math.min(percent, 100).toFixed(1);
  };

  const handleFinalizeAssessment = async () => {
    if (!activeAssessmentId) return;
    if (window.confirm("Anda yakin ingin Kunci & Finalisasi Assessment ini?\n\nPerhatian: Setelah difinalisasi, status akan menjadi 'Selesai' dan seluruh Kertas Kerja akan dikunci permanen (Read-Only).")) {
      try {
        const res = await fetchApi(`/assessments/${activeAssessmentId}/data`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Selesai' })
        });
        if (res.ok) { 
          await fetchAssessments(); 
          showNotification('success', 'Assessment berhasil dikunci dan difinalisasi!');
        } else throw new Error();
      } catch (error) { 
        showNotification('error', 'Gagal mengunci assessment ke server!');
      }
    }
  };

  const handleInteraction = async () => {
    if (activeAssessment && activeAssessment.status === 'Draft') {
      try {
        await fetchApi(`/assessments/${activeAssessment.id}/data`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Proses' })
        });
        fetchAssessments(); 
      } catch (e) { console.error(e) }
    }
  };

  const handleSaveKertasKerjaData = async (newData: Record<string, any>) => {
    if (!activeAssessment) return;
    const updatedAssessments = assessments.map(a => a.id === activeAssessment.id ? { ...a, data: newData } : a);
    setAssessments(updatedAssessments);
    try {
      await fetchApi(`/assessments/${activeAssessment.id}/data`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: newData })
      });
    } catch (e) { 
      showNotification('error', 'Gagal menyimpan Kertas Kerja ke server!');
    }
  };

  const visibleAssessments = assessments.filter(a => { 
    if (user?.role !== "auditor") return true; 
    return a.members.some(m => m.name === user?.name) || isLeader; 
  });

  const filteredAssessments = visibleAssessments.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchSearch = 
      (item.year?.toLowerCase() || '').includes(q) ||
      (item.tb?.toLowerCase() || '').includes(q) ||
      (item.noSt?.toLowerCase() || '').includes(q) ||
      (item.pt?.toLowerCase() || '').includes(q) ||
      (item.kt?.toLowerCase() || '').includes(q);
    
    const matchStatus = statusFilter === 'Semua' || item.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const totalItems = filteredAssessments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredAssessments.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status: string) => {
    const isCompleted = status === 'Selesai' || status === 'Completed';
    const isProses = status === 'Proses' || status === 'Assessment';
    return (
      <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1.5 w-max ${isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : isProses ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
        {isCompleted && <CheckCircle2 size={12} strokeWidth={3} />}
        {isProses && <RefreshCw size={12} strokeWidth={3} />}
        {!isCompleted && !isProses && <AlertTriangle size={12} strokeWidth={3} />}
        {status}
      </span>
    );
  };

  // === RENDER 3: HALAMAN DALAM KERTAS KERJA (ASPEK SPECIFIC) ===
  if (selectedAspect && activeAssessment) {
    const aspectIndex = masterData.findIndex(a => a.id === selectedAspect.id);
    const displayAspectName = `Aspek ${aspectIndex + 1} - ${selectedAspect.name}`;

    const aspectIcon = ASPECT_ICONS[aspectIndex % ASPECT_ICONS.length] || Layers;
    const aspectColor = ASPECT_COLORS[aspectIndex % ASPECT_COLORS.length];

    const currentPic = activeAssessment.members?.find(m => m.aspectId === selectedAspect.id);
    const isPICForThisAspect = currentPic?.name === user?.name;
    const isCompleted = activeAssessment.status === 'Selesai' || activeAssessment.status === 'Completed';
    const isReadOnly = isCompleted || (isLeader && !isPICForThisAspect);

    let globalIndStart = 1;
    let globalParamStart = 1;

    for (const asp of masterData) {
      if (asp.id === selectedAspect.id) break;
      const aspData = activeAssessment.data[asp.id] || [];
      globalIndStart += aspData.length;
      aspData.forEach((ind: any) => {
        globalParamStart += (ind.parameters || []).length;
      });
    }

    return (
      <div className="relative">
        {notification && (
          <div className={`fixed bottom-6 right-6 z-[300] px-5 py-3.5 rounded-2xl border flex items-center space-x-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300 ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <AlertTriangle size={20} strokeWidth={2.5} />}
            <span className="font-bold text-[11px] uppercase tracking-widest">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-4 p-1.5 hover:bg-white/50 rounded-lg transition-colors"><X size={16} strokeWidth={3}/></button>
          </div>
        )}

        <KertasKerja
          assessmentId={activeAssessment.id}
          assessmentYear={activeAssessment.year}
          aspect={{ id: selectedAspect.id, name: displayAspectName, icon: aspectIcon, color: aspectColor }}
          masterAspectBobot={selectedAspect.bobot || 0}
          onBack={() => setSelectedAspect(null)}
          assessmentData={activeAssessment.data || {}}
          setAssessmentData={handleSaveKertasKerjaData} 
          evidences={evidences}
          setEvidences={setEvidences}
          documentRequests={documentRequests}
          setDocumentRequests={setDocumentRequests}
          isReadOnly={isReadOnly}
          onInteraction={handleInteraction}
          globalIndStart={globalIndStart}
          globalParamStart={globalParamStart}
        />
      </div>
    );
  }

  // === RENDER 2: HALAMAN DETAIL ASSESSMENT (GRID ASPEK) ===
  if (activeAssessmentId && activeAssessment) {
    const isCompleted = activeAssessment.status === 'Selesai' || activeAssessment.status === 'Completed';
    const isProses = activeAssessment.status === 'Proses' || activeAssessment.status === 'Assessment';

    // KALKULASI TOTAL SKOR & PROGRESS
    let totalAssessmentScore = 0;
    let totalAssessmentBobot = 0;

    masterData.forEach(aspect => {
      const aspectBobot = Number(aspect.bobot || 0);
      totalAssessmentBobot += aspectBobot;

      if (activeAssessment.data && activeAssessment.data[aspect.id]) {
        const aspectData = activeAssessment.data[aspect.id];
        let aspectScore = 0;
        aspectData.forEach((ind: any) => { aspectScore += (ind.indicatorScore || 0); });
        totalAssessmentScore += aspectScore;
      }
    });

    const overallProgress = totalAssessmentBobot > 0 ? (totalAssessmentScore / totalAssessmentBobot) * 100 : 0;
    const safeOverallProgress = Math.min(overallProgress, 100).toFixed(2);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 text-left w-full min-w-0 pb-10 max-w-7xl mx-auto relative font-sans">
        
        {notification && (
          <div className={`fixed bottom-6 right-6 z-[300] px-5 py-3.5 rounded-2xl border flex items-center space-x-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300 ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <AlertTriangle size={20} strokeWidth={2.5} />}
            <span className="font-bold text-[11px] uppercase tracking-widest">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-4 p-1.5 hover:bg-white/50 rounded-lg transition-colors"><X size={16} strokeWidth={3}/></button>
          </div>
        )}

        <button onClick={() => setActiveAssessmentId(null)} className="flex items-center space-x-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm transition-all active:scale-95 text-xs tracking-widest uppercase w-max">
          <ArrowLeft size={16} strokeWidth={2.5} /> <span>KEMBALI KE DAFTAR</span>
        </button>

        {/* HEADER DENGAN SKOR TOTAL */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-8 rounded-3xl shadow-xl shadow-indigo-200 flex flex-col lg:flex-row lg:justify-between lg:items-center text-white relative overflow-hidden gap-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-3xl rounded-full -mr-40 -mt-40 pointer-events-none"></div>
          
          <div className="z-10 flex-1">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-1 flex items-center gap-3">
                Assessment GCG {activeAssessment.year}
              </h1>
              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm border ${isCompleted ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : isProses ? 'bg-indigo-500/30 border-indigo-400/50 text-indigo-300' : 'bg-amber-500/20 border-amber-500/50 text-amber-300'}`}>
                {isCompleted && <CheckCircle2 size={12} strokeWidth={3} />}
                {isProses && <RefreshCw size={12} strokeWidth={3} />}
                {!isCompleted && !isProses && <ShieldCheck size={12} strokeWidth={3} />}
                {activeAssessment.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-3 text-[10px] font-bold text-indigo-200 uppercase tracking-widest">
              <span className="bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">Surat Tugas: {activeAssessment.tb}</span>
              {activeAssessment.noSt && <span className="bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">No ST: {activeAssessment.noSt}</span>}
            </div>
          </div>

          <div className="z-10 flex flex-col sm:flex-row items-center gap-4">
            {/* PANEL PROGRESS KESELURUHAN */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-5 py-3.5 rounded-2xl flex items-center gap-5 w-full sm:w-auto shadow-inner">
              <div>
                <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest text-right mb-1">Skor Total</p>
                <p className="text-2xl font-black text-white leading-none">{totalAssessmentScore.toFixed(3)}</p>
              </div>
              <div className="w-px h-10 bg-white/20"></div>
              <div>
                <p className="text-[9px] font-black text-emerald-300 uppercase tracking-widest text-right mb-1">Progress</p>
                <div className="flex items-end gap-1.5">
                  <p className="text-2xl font-black text-emerald-400 leading-none">{safeOverallProgress}%</p>
                </div>
              </div>
            </div>

            {isLeader && !isCompleted && (
              <button
                onClick={handleFinalizeAssessment}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-6 py-4.5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-transform transform active:scale-95 border border-emerald-400 w-full sm:w-auto h-full"
              >
                <Lock size={16} strokeWidth={3} /> Finalisasi
              </button>
            )}
          </div>
        </div>

        {/* GRID ASPEK YANG LEBIH COMPACT */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pt-2">
          {masterData.map((aspect, index) => {
            const pic = activeAssessment.members?.find(m => m.aspectId === aspect.id);
            const isPICForThisAspect = pic?.name === user?.name;
            const canAccess = isPICForThisAspect || isLeader;

            if (user?.role === 'auditor' && !canAccess) return null;

            const Icon = ASPECT_ICONS[index % ASPECT_ICONS.length] || Layers;
            const colorClass = ASPECT_COLORS[index % ASPECT_COLORS.length];
            const aspectBobot = Number(aspect.bobot || 0);
            const progress = calculateProgress(aspect.id, aspectBobot);
            const displayAspectName = aspect.name;
            
            const isFullyDone = progress === '100.0';

            return (
              <div key={aspect.id} onClick={() => canAccess ? setSelectedAspect(aspect) : null} className={`group bg-white p-5 border rounded-2xl transition-all duration-300 relative shadow-sm hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100 cursor-pointer overflow-hidden flex flex-col h-full ${isLeader && !isPICForThisAspect ? 'border-slate-200 opacity-90 grayscale-[20%]' : 'border-slate-100'}`}>
                
                {/* Header Card */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2.5 rounded-xl border ${colorClass}`}><Icon size={18} strokeWidth={2.5} /></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Aspek {index + 1}</span>
                  </div>
                  <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-right shadow-inner">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Bobot</span>
                    <span className="text-sm font-black text-slate-800 leading-none">{aspectBobot.toFixed(2)}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xs font-bold text-slate-700 mb-5 line-clamp-2 leading-relaxed group-hover:text-indigo-700 transition-colors flex-1 pr-2" title={displayAspectName}>{displayAspectName}</h3>

                {/* Footer (PIC & Progress) */}
                <div className="mt-auto space-y-3">
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-600 border border-slate-200">{pic?.name?.charAt(0) || "?"}</div>
                      <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{pic?.name || "Unassigned"}</span>
                    </div>
                    {isLeader && !isPICForThisAspect && <Lock size={12} className="text-rose-400" strokeWidth={2.5}/>}
                  </div>
                  
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest mb-1.5">
                      <span className="text-slate-400 flex items-center gap-1"><Target size={10}/> Pencapaian</span>
                      <span className={isFullyDone ? 'text-emerald-600' : 'text-indigo-600'}>{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full transition-all duration-1000 ease-out ${isFullyDone ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // === RENDER 1: HALAMAN UTAMA HISTORY (LIST / GRID TOGGLE DGN PAGINATION) ===
  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left w-full min-w-0 pb-10 max-w-7xl mx-auto font-sans relative">
      
      {/* COMPONENT TOAST NOTIFICATION */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-[300] px-5 py-3.5 rounded-2xl border flex items-center space-x-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300 ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <AlertTriangle size={20} strokeWidth={2.5} />}
          <span className="font-bold text-[11px] uppercase tracking-widest">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-4 p-1.5 hover:bg-white/50 rounded-lg transition-colors"><X size={16} strokeWidth={3}/></button>
        </div>
      )}

      {/* HEADER BESAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Daftar Assessment</h1>
            {isSyncing && (
              <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full animate-in fade-in zoom-in duration-300">
                <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" />
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Memuat...</span>
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">Kelola dan akses evaluasi GCG per Tahun Buku</p>
        </div>
        {canCreateAssessment && (
          <button onClick={() => setShowModal(true)} disabled={isSyncing} className="relative z-10 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4.5 rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/30 active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 group overflow-hidden disabled:opacity-50">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none"></div>
            <Plus size={18} strokeWidth={3} className="relative z-10" /> <span className="relative z-10">Mulai Assessment Baru</span>
          </button>
        )}
      </div>

      {/* FILTER & TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-72 group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block pl-10 p-2.5 outline-none transition-all shadow-sm placeholder-slate-400"
              placeholder="Cari Tahun, No Surat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Status */}
          <div className="relative w-full sm:w-48">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-indigo-500" />
            </div>
            <select 
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:bg-white transition-all cursor-pointer shadow-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Semua">Semua Status</option>
              <option value="Draft">Draft</option>
              <option value="Proses">Proses</option>
              <option value="Selesai">Selesai</option>
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Toggle Grid/List */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0 w-full md:w-auto justify-center">
          <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-widest ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
            <LayoutGrid size={16}/> Grid
          </button>
          <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-widest ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
            <List size={16}/> Tabel
          </button>
        </div>
      </div>

      {/* KARTU DAFTAR ASSESSMENT DENGAN PAGINATION (Jika Tabel) */}
      <div className={`transition-opacity duration-500 ${isSyncing ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        {filteredAssessments.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              /* ================= MODE GRID (KARTU COMPACT - TANPA PAGINATION) ================= */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredAssessments.map((item) => (
                  <div key={item.id} onClick={() => setActiveAssessmentId(item.id)} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xl hover:shadow-indigo-100 hover:border-indigo-300 transition-all duration-300 cursor-pointer relative group flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      {getStatusBadge(item.status)}
                      {canCreateAssessment && item.status !== 'Selesai' && item.status !== 'Completed' && (
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 p-1 rounded-xl border border-slate-100">
                          <button onClick={(e) => openEditModal(e, item)} className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-indigo-100 shadow-sm"><Edit3 size={14} strokeWidth={2.5} /></button>
                          <button onClick={(e) => deleteTb(e, item.id)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-rose-100 shadow-sm"><Trash2 size={14} strokeWidth={2.5} /></button>
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Megaphone size={12} /> Pelaksanaan GCG</p>
                      <h3 className="text-xl font-black text-slate-800 leading-none group-hover:text-indigo-600 transition-colors">Tahun Buku {item.year}</h3>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 mb-2 border border-slate-100/50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Surat Tugas</p>
                      <p className="text-[11px] font-bold text-slate-700 leading-tight">{item.tb}</p>
                      {item.noSt && <p className="text-[9px] font-bold text-indigo-600 mt-1.5 bg-indigo-50 px-2 py-0.5 rounded inline-block uppercase tracking-widest border border-indigo-100">{item.noSt}</p>}
                    </div>

                    <div className="border-t border-slate-100 pt-4 mt-auto flex justify-between items-end">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ketua Tim / PT :</p>
                        <p className="text-[10px] font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded w-max border border-slate-200 flex items-center gap-1"><ShieldCheck size={10} className="text-slate-500" /> {item.pt}</p>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 transition-transform group-hover:-translate-x-1 group-hover:bg-indigo-100">
                        <ChevronRight size={14} strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ================= MODE LIST (TABEL DENGAN PAGINATION) ================= */
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col">
                <div className="overflow-x-auto custom-scrollbar flex-1">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                      <tr>
                        <th className="px-5 py-4 w-12 text-center border-r border-slate-200">No</th>
                        <th className="px-5 py-4 border-r border-slate-200">Info Assessment</th>
                        <th className="px-5 py-4 border-r border-slate-200">Surat Tugas</th>
                        <th className="px-5 py-4 border-r border-slate-200">Pimpinan (PT/KT)</th>
                        <th className="px-5 py-4 border-r border-slate-200 text-center">Status</th>
                        <th className="px-5 py-4 text-center w-32">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {currentData.map((item, idx) => (
                        <tr key={item.id} onClick={() => setActiveAssessmentId(item.id)} className="hover:bg-indigo-50/40 transition-colors cursor-pointer group">
                          <td className="px-5 py-4 text-center font-bold text-slate-400 border-r border-slate-100">{startIndex + idx + 1}</td>
                          <td className="px-5 py-4 border-r border-slate-100">
                            <p className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">Tahun Buku {item.year}</p>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Data GCG Terpusat</span>
                          </td>
                          <td className="px-5 py-4 border-r border-slate-100">
                            <p className="font-bold text-slate-700 text-xs">{item.tb}</p>
                            {item.noSt && <span className="text-[9px] font-bold text-indigo-600 mt-1.5 bg-indigo-50 px-2 py-0.5 rounded inline-block uppercase tracking-wider border border-indigo-100">{item.noSt}</span>}
                          </td>
                          <td className="px-5 py-4 border-r border-slate-100">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5"><ShieldCheck size={12} className="text-indigo-500"/> {item.pt}</span>
                              <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5"><Users size={12} className="text-indigo-500"/> {item.kt}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center border-r border-slate-100">
                            <div className="flex justify-center">{getStatusBadge(item.status)}</div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {canCreateAssessment && item.status !== 'Selesai' && item.status !== 'Completed' ? (
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={(e) => openEditModal(e, item)} className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-lg transition-colors border border-transparent hover:border-indigo-200"><Edit3 size={14} strokeWidth={2.5} /></button>
                                <button onClick={(e) => deleteTb(e, item.id)} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors border border-transparent hover:border-rose-200"><Trash2 size={14} strokeWidth={2.5} /></button>
                              </div>
                            ) : (
                              <div className="p-1.5 text-slate-300 mx-auto w-max"><Lock size={14}/></div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* KONTROL PAGINATION (Hanya di mode Tabel) */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50/80 border-t border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tampilkan</span>
                    <select
                      className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500 cursor-pointer shadow-sm transition-colors"
                      value={itemsPerPage}
                      onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    >
                      <option value={5}>5 Baris</option>
                      <option value={10}>10 Baris</option>
                      <option value={25}>25 Baris</option>
                      <option value={50}>50 Baris</option>
                    </select>
                  </div>

                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} dari {totalItems} Data
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm"
                    >
                      <ChevronLeft size={16} strokeWidth={2.5}/>
                    </button>
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">
                      Hal {currentPage} / {totalPages || 1}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm"
                    >
                      <ChevronRight size={16} strokeWidth={2.5}/>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-16 text-center bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 flex items-center justify-center rounded-full mb-5">
              <Search size={32} className="text-slate-300" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-1.5">Tidak Ada Data Ditemukan</h3>
            <p className="text-slate-500 font-medium text-xs">
              {searchQuery || statusFilter !== 'Semua' 
                ? 'Coba ganti kata kunci pencarian atau ubah filter status.' 
                : 'Silakan buat assessment baru untuk memulai evaluasi GCG.'}
            </p>
          </div>
        )}
      </div>

      {/* FORM MODAL - MENGGUNAKAN PENOMORAN ASPEK */}
      {showModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-[0.97] duration-300 relative flex flex-col max-h-[90vh]">

            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white/50 relative z-10 shrink-0">
              <h2 className="font-black text-xl text-slate-800 flex items-center gap-3 tracking-tight">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  {isEditing ? <Edit3 size={20} strokeWidth={2.5} /> : <Plus size={20} strokeWidth={2.5} />}
                </div>
                {isEditing ? 'Data Assessment' : 'Setup Penilaian Baru'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:bg-slate-100 hover:text-slate-700 p-2 rounded-xl transition-colors active:scale-90 bg-slate-50 border border-slate-100"><X size={20} strokeWidth={2.5} /></button>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 relative z-10 bg-white">
              <form onSubmit={handleSave} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                
                {/* SECTION 1: FORM SURAT TUGAS */}
                <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b border-slate-200 pb-3 flex items-center gap-2"><Briefcase size={14} strokeWidth={3} /> Administrasi Surat Tugas</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="group">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Tahun Buku</label>
                      <input required type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-slate-700 text-sm shadow-sm" />
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Tanggal Surat</label>
                      <input required type="date" value={form.tb} onChange={e => setForm({ ...form, tb: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-slate-700 cursor-pointer text-sm shadow-sm" />
                    </div>
                  </div>

                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Nomor Surat Tugas</label>
                    <input required value={form.noSt} onChange={e => setForm({ ...form, noSt: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-slate-700 text-sm shadow-sm" />
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Pengendali Teknis</label>
                    <input required value={form.pt} onChange={e => setForm({ ...form, pt: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-slate-700 text-sm shadow-sm" />
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Ketua Tim</label>
                    <input required value={form.kt} onChange={e => setForm({ ...form, kt: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-slate-700 text-sm shadow-sm" />
                  </div>
                </div>

                {/* SECTION 2: MAPPING AUDITOR */}
                <div className="space-y-5 flex flex-col h-full bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Users size={14} strokeWidth={3} /> Mapping Auditor & Aspek</h4>
                    <button type="button" onClick={() => setForm({ ...form, members: [...form.members, { name: "", aspectId: masterData[0]?.id || "" }] })} className="text-[9px] font-black bg-white hover:bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 flex items-center gap-1 shadow-sm"><Plus size={12} strokeWidth={3} /> TAMBAH</button>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar min-h-[250px]">
                    {form.members.map((m, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm relative">
                        <div className="flex-1 space-y-2.5">
                          <select required className="w-full px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 hover:bg-white cursor-pointer transition-all" value={m.name} onChange={e => { const updated = [...form.members]; updated[idx].name = e.target.value; setForm({ ...form, members: updated }); }}>
                            <option value="" disabled>-- Pilih Auditor --</option>
                            {auditors.map(a => (<option key={a.id} value={a.name}>{a.name}</option>))}
                          </select>
                          
                          {/* DROPDOWN DENGAN PENOMORAN ASPEK OTOMATIS */}
                          <select required className="w-full px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 hover:bg-white cursor-pointer transition-all" value={m.aspectId} onChange={e => { const updated = [...form.members]; updated[idx].aspectId = e.target.value; setForm({ ...form, members: updated }); }}>
                            <option value="" disabled>-- Pilih Aspek --</option>
                            {masterData.map((a, aspectIndex) => (
                              <option key={a.id} value={a.id}>Aspek {aspectIndex + 1} - {a.name}</option>
                            ))}
                          </select>
                        </div>
                        {form.members.length > 1 && (
                          <button type="button" onClick={() => setForm({ ...form, members: form.members.filter((_, i) => i !== idx) })} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors border border-transparent hover:border-rose-100 shrink-0">
                            <Trash2 size={16} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-200 mt-auto">
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-transform active:scale-95 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 group overflow-hidden relative">
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none"></div>
                      <Save size={16} strokeWidth={3} className="relative z-10" /> <span className="relative z-10">{isEditing ? 'Simpan Perubahan' : 'Buat Assessment'}</span>
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