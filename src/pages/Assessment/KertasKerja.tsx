import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, ChevronRight, ChevronDown, FileText, Save, Layers, X, UploadCloud, BellRing, Clock, AlertCircle, History as HistoryIcon, Copy, Download, Trash2, Eye, Lock, CheckCircle2, AlertTriangle, Settings, FolderOpen, PanelRightClose, Search, Navigation, Filter, EyeOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { EvidenceFile, DocumentRequest } from '../../types';

export interface SubFactorData { id: string; name: string; description?: string; subFactorScore?: number; }
export interface FactorData { id: string; name: string; description: string; subFactors?: SubFactorData[]; factorScore: number; recommendation: string; picDivisi?: string; dueDate?: string; picAuditor?: string; _displayNum?: number; }
export interface ParameterData { id: string; parameterName: string; bobot?: number; parameterScore: number; fulfillment: number; factors: FactorData[]; _displayNum?: number; }
export interface IndicatorData { id: string; indicatorName: string; bobot?: number; indicatorScore: number; aspectScore: number; parameters: ParameterData[]; _displayNum?: number; }
export interface AspectData { id: string; name: string; icon: LucideIcon | React.ReactNode; color: string; }

interface KertasKerjaProps {
  assessmentId: string;
  assessmentYear: string;
  aspect: AspectData;
  masterAspectBobot: number;
  onBack: () => void;
  assessmentData: Record<string, IndicatorData[]>;
  setAssessmentData: (data: Record<string, IndicatorData[]>) => void;
  evidences?: EvidenceFile[];
  setEvidences?: React.Dispatch<React.SetStateAction<EvidenceFile[]>>;
  documentRequests?: DocumentRequest[];
  setDocumentRequests?: React.Dispatch<React.SetStateAction<DocumentRequest[]>>;
  isReadOnly?: boolean;
  onInteraction?: () => void;
  globalIndStart?: number;
  globalParamStart?: number;
}

// ============================================================================
// KOMPONEN INLINE TEXTAREA (AUTO-SAVE)
// ============================================================================
const InlineTextarea = ({ value, onBlur, placeholder, disabled }: { value: string, onBlur: (val: string) => void, placeholder: string, disabled: boolean }) => {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => { setLocalValue(value || ''); }, [value]);

  return (
    <textarea
      disabled={disabled}
      className={`w-full min-h-[80px] text-[11px] font-medium p-3 rounded-xl outline-none transition-all resize-y custom-scrollbar ${
        disabled 
          ? 'bg-transparent text-slate-600 border-transparent resize-none' 
          : 'bg-slate-50/50 hover:bg-indigo-50/30 focus:bg-white text-slate-800 border border-slate-200 hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm'
      }`}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => { if (localValue !== (value || '')) onBlur(localValue); }}
      placeholder={disabled ? '-' : placeholder}
    />
  );
};

const KertasKerja: React.FC<KertasKerjaProps> = ({
  assessmentId, assessmentYear, aspect, masterAspectBobot, onBack, assessmentData, setAssessmentData, isReadOnly = false, onInteraction,
  globalIndStart = 1, globalParamStart = 1
}) => {
  const { user } = useAuth();
  
  // State Navigasi & Search
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ref untuk Sticky Header
  const theadRef = useRef<HTMLTableSectionElement>(null);

  // State untuk Toggle SEMUA Kolom
  const [showColDropdown, setShowColDropdown] = useState(false);
  const [showCols, setShowCols] = useState({
    noInd: true, indikator: true, bobotInd: true,
    noPar: true, parameter: true, bobotPar: true,
    uji: true, faktorUji: true, subFaktorUji: true,
    keterangan: true, evidence: true, inputNilai: true,
    skorUji: true, skorPar: true, rekomendasi: true,
    targetTl: true, skorInd: true, skorAsp: true
  });

  // State untuk Sticky Context Header
  const [activeContext, setActiveContext] = useState({ ind: '', param: '' });

  // State Panel & Modal
  const [drawerConfig, setDrawerConfig] = useState<{ show: boolean, iIdx: number | null, pIdx: number | null, fIdx: number | null, data: FactorData | null }>({ show: false, iIdx: null, pIdx: null, fIdx: null, data: null });
  const [subFactorModal, setSubFactorModal] = useState<{ show: boolean, iIdx: number | null, pIdx: number | null, fIdx: number | null, subFactors: SubFactorData[] }>({ show: false, iIdx: null, pIdx: null, fIdx: null, subFactors: [] });

  const [requestDivisi, setRequestDivisi] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [divisions, setDivisions] = useState<string[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNoteInput, setRejectNoteInput] = useState('');
  const [viewingDocument, setViewingDocument] = useState<EvidenceFile | null>(null);
  const [isArchivePickerOpen, setIsArchivePickerOpen] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');

  const [dbEvidences, setDbEvidences] = useState<EvidenceFile[]>([]);
  const [dbRequests, setDbRequests] = useState<DocumentRequest[]>([]);
  const [prevAssessment, setPrevAssessment] = useState<any>(null);
  const [tlRecords, setTlRecords] = useState<any>({});

  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = async () => {
    const headers = { 'Accept': 'application/json' };
    try {
      const resDiv = await fetchApi('/divisions', { headers });
      if (resDiv.ok) {
        const d = await resDiv.json();
        if (Array.isArray(d)) setDivisions(d);
      }
      const resEv = await fetchApi('/evidences', { headers });
      if (resEv.ok) setDbEvidences(await resEv.json());
      const resReq = await fetchApi('/document-requests', { headers });
      if (resReq.ok) setDbRequests(await resReq.json());
      const resTl = await fetchApi('/tl-records', { headers });
      if (resTl.ok) setTlRecords(await resTl.json());
      const resAss = await fetchApi('/assessments', { headers });
      if (resAss.ok) {
        const dAss = await resAss.json();
        if (Array.isArray(dAss)) {
          const pAss = dAss.find((a: any) => String(a.year) === String(Number(assessmentYear) - 1) && a.status !== 'Draft');
          setPrevAssessment(pAss);
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, [assessmentYear]);

  const rawData = assessmentData ? (assessmentData[aspect?.id] || []) : [];

  // PRA-KALKULASI PENOMORAN
  const displayData = useMemo(() => {
    return rawData.map((indicator, iIdx) => {
      const indNum = globalIndStart + iIdx;
      let paramOffset = 0;
      for (let i = 0; i < iIdx; i++) paramOffset += (rawData[i].parameters?.length || 0);

      const parameters = (indicator.parameters || []).map((param, pIdx) => {
        const paramNum = globalParamStart + paramOffset + pIdx;
        const factors = (param.factors || []).map((factor, fIdx) => {
          const factorNum = fIdx + 1; 
          return { ...factor, _displayNum: factorNum };
        });
        return { ...param, factors, _displayNum: paramNum };
      });
      return { ...indicator, parameters, _displayNum: indNum };
    });
  }, [rawData, globalIndStart, globalParamStart]);

  // DATA FILTERED (Search Universal)
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return displayData;
    const lowerQ = searchQuery.toLowerCase();

    return displayData.map(ind => {
      const indMatch = ind.indicatorName.toLowerCase().includes(lowerQ);

      const filteredParams = ind.parameters.map(param => {
        const paramMatch = param.parameterName.toLowerCase().includes(lowerQ);

        const filteredFactors = param.factors.filter(f => 
          indMatch || paramMatch || f.name.toLowerCase().includes(lowerQ) || (f.description && f.description.toLowerCase().includes(lowerQ))
        );

        return { ...param, factors: filteredFactors };
      }).filter(p => indMatch || p.factors.length > 0);

      return { ...ind, parameters: filteredParams };
    }).filter(ind => ind.parameters.length > 0);
  }, [displayData, searchQuery]);

  // LOGIKA STICKY CONTEXT HEADER YANG DIPERBAIKI
  useEffect(() => {
    const handleScroll = () => {
      if (!theadRef.current) return;
      // Dapatkan batas bawah dari header tabel asli (biar dinamis berapapun tingginya)
      const theadBottom = theadRef.current.getBoundingClientRect().bottom;
      const rows = document.querySelectorAll('tr[data-context="true"]');
      
      let currentInd = '';
      let currentPar = '';

      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect();
        // Cek jika baris sudah menyentuh / masuk di bawah area thead
        if (rect.top <= theadBottom + 15) {
          currentInd = rows[i].getAttribute('data-ind-name') || '';
          currentPar = rows[i].getAttribute('data-param-name') || '';
        } else {
          break; // Stop loop kalau baris ini masih di bawah (belum masuk header)
        }
      }

      setActiveContext({ ind: currentInd, param: currentPar });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredData]);

  // KALKULASI DINAMIS COLSPAN (Untuk Collapse)
  const totalVisibleCols = Object.values(showCols).filter(Boolean).length;
  
  const middleIndCols = ['noPar', 'parameter', 'bobotPar', 'uji', 'faktorUji', 'subFaktorUji', 'keterangan', 'evidence', 'inputNilai', 'skorUji', 'skorPar', 'rekomendasi', 'targetTl'];
  const indColSpan = middleIndCols.filter(c => showCols[c as keyof typeof showCols]).length;

  const middleParamCols1 = ['uji', 'faktorUji', 'subFaktorUji', 'keterangan', 'evidence', 'inputNilai', 'skorUji'];
  const paramColSpan1 = middleParamCols1.filter(c => showCols[c as keyof typeof showCols]).length;

  const middleParamCols2 = ['rekomendasi', 'targetTl'];
  const paramColSpan2 = middleParamCols2.filter(c => showCols[c as keyof typeof showCols]).length;

  const toggleCollapse = (id: string) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const calculateScores = (indicators: IndicatorData[]): IndicatorData[] => {
    let totalAspectScore = 0;
    const updatedIndicators = (indicators || []).map(indicator => {
      let totalIndicatorScore = 0;
      const updatedParameters = (indicator.parameters || []).map(param => {
        const factors = param.factors || [];
        const avgFactorScore = factors.reduce((sum, f) => sum + (Number(f.factorScore) || 0), 0) / (factors.length || 1);
        const paramScore = avgFactorScore * (Number(param.bobot) || 0);
        totalIndicatorScore += paramScore;
        return { ...param, parameterScore: paramScore, fulfillment: avgFactorScore * 100 };
      });
      totalAspectScore += totalIndicatorScore;
      return { ...indicator, parameters: updatedParameters, indicatorScore: totalIndicatorScore, aspectScore: 0 };
    });
    return updatedIndicators.map(ind => ({ ...ind, aspectScore: totalAspectScore }));
  };

  // AUTO-SAVE HANDLER
  const handleInlineUpdate = async (iIdx: number, pIdx: number, fIdx: number, field: string, newValue: any) => {
    if (isReadOnly) return;
    const targetFactorId = filteredData[iIdx].parameters[pIdx].factors[fIdx].id;
    const rawIIdx = rawData.findIndex(ind => ind.id === filteredData[iIdx].id);
    const rawPIdx = rawData[rawIIdx].parameters.findIndex(p => p.id === filteredData[iIdx].parameters[pIdx].id);
    const rawFIdx = rawData[rawIIdx].parameters[rawPIdx].factors.findIndex(f => f.id === targetFactorId);

    const newData = [...rawData];
    newData[rawIIdx].parameters[rawPIdx].factors[rawFIdx] = {
      ...newData[rawIIdx].parameters[rawPIdx].factors[rawFIdx],
      [field]: newValue,
      picAuditor: user?.name || 'Auditor'
    };

    const updatedData = calculateScores(newData);
    const newAssessmentData = { ...assessmentData, [aspect.id]: updatedData };
    setAssessmentData(newAssessmentData);

    try {
      await fetchApi(`/assessments/${assessmentId}/data`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: newAssessmentData, status: 'Proses' })
      });
      showNotification('success', 'Tersimpan otomatis.');
      if (onInteraction) onInteraction();
    } catch (err) {
      showNotification('error', 'Gagal auto-save ke server.');
    }
  };

  const handleSaveSubFactors = async () => {
    if (isReadOnly || subFactorModal.iIdx === null || subFactorModal.pIdx === null || subFactorModal.fIdx === null) return;
    const targetFactorId = filteredData[subFactorModal.iIdx].parameters[subFactorModal.pIdx].factors[subFactorModal.fIdx].id;
    const rawIIdx = rawData.findIndex(ind => ind.id === filteredData[subFactorModal.iIdx!].id);
    const rawPIdx = rawData[rawIIdx].parameters.findIndex(p => p.id === filteredData[subFactorModal.iIdx!].parameters[subFactorModal.pIdx!].id);
    const rawFIdx = rawData[rawIIdx].parameters[rawPIdx].factors.findIndex(f => f.id === targetFactorId);

    const newData = [...rawData];
    const avgScore = subFactorModal.subFactors.reduce((sum, s) => sum + (Number(s.subFactorScore) || 0), 0) / (subFactorModal.subFactors.length || 1);
    
    newData[rawIIdx].parameters[rawPIdx].factors[rawFIdx] = {
      ...newData[rawIIdx].parameters[rawPIdx].factors[rawFIdx],
      subFactors: subFactorModal.subFactors,
      factorScore: avgScore,
      picAuditor: user?.name || 'Auditor'
    };

    const updatedData = calculateScores(newData);
    const newAssessmentData = { ...assessmentData, [aspect.id]: updatedData };
    setAssessmentData(newAssessmentData);

    try {
      await fetchApi(`/assessments/${assessmentId}/data`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: newAssessmentData, status: 'Proses' })
      });
      showNotification('success', 'Skor Sub-Faktor berhasil disimpan.');
      if (onInteraction) onInteraction();
      setSubFactorModal({ show: false, iIdx: null, pIdx: null, fIdx: null, subFactors: [] });
    } catch (err) {
      showNotification('error', 'Gagal menyimpan skor sub-faktor.');
    }
  };

  const openDrawer = (iIdx: number, pIdx: number, fIdx: number) => {
    setDrawerConfig({ show: true, iIdx, pIdx, fIdx, data: filteredData[iIdx].parameters[pIdx].factors[fIdx] });
    setRequestDivisi(''); setRequestNote(''); setRejectingId(null); setRejectNoteInput('');
  };

  const closeDrawer = () => setDrawerConfig({ show: false, iIdx: null, pIdx: null, fIdx: null, data: null });

  const handleUploadOlehAuditor = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Logic upload... (Sama seperti sebelumnya)
    if (e.target.files && e.target.files.length > 0 && !isReadOnly) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) return showNotification('error', `Gagal: Ukuran file terlalu besar! Maksimal 10MB.`);

      const { iIdx, pIdx, fIdx } = drawerConfig;
      if (iIdx !== null && pIdx !== null && fIdx !== null) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('id', `EV-${Date.now()}`);
        formData.append('assessmentId', assessmentId);
        formData.append('assessmentYear', assessmentYear);
        formData.append('aspectId', aspect.id);
        formData.append('indicatorId', filteredData[iIdx].id);
        formData.append('parameterId', filteredData[iIdx].parameters[pIdx].id);
        formData.append('factorId', filteredData[iIdx].parameters[pIdx].factors[fIdx].id);
        formData.append('divisi', 'Auditor (Internal)');
        formData.append('uploadDate', new Date().toISOString().split('T')[0]);

        try {
          const response = await fetchApi('/evidences', { method: 'POST', body: formData });
          if (!response.ok) throw new Error();
          showNotification('success', 'Dokumen berhasil diunggah!');
          fetchData();
          if (onInteraction) onInteraction();
        } catch (err) {
          showNotification('error', 'Gagal upload file ke server.');
        }
      }
    }
  };

  const handleDeleteEvidence = async (evidenceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) return;
    if (window.confirm("Yakin ingin menghapus dokumen ini dari server?")) {
      await fetchApi(`/evidences/${evidenceId}`, { method: 'DELETE', });
      showNotification('success', 'Dokumen dihapus.');
      fetchData();
      if (onInteraction) onInteraction();
    }
  };

  const handleDeleteRequest = async (reqId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) return;
    if (window.confirm("Yakin ingin membatalkan Tagihan Dokumen untuk divisi ini?")) {
      await fetchApi(`/document-requests/${reqId}`, { method: 'DELETE' });
      showNotification('success', 'Tagihan dibatalkan.');
      fetchData();
      if (onInteraction) onInteraction();
    }
  };

  const handleRequestDocument = async () => {
    if (isReadOnly) return;
    if (!requestDivisi) return showNotification('error', "Pilih divisi auditee terlebih dahulu!");
    const { iIdx, pIdx, fIdx } = drawerConfig;
    if (iIdx !== null && pIdx !== null && fIdx !== null) {
      const parameter = filteredData[iIdx].parameters[pIdx];
      const targetFactorId = parameter.factors[fIdx].id;
      const payload = {
        id: `REQ-${Date.now()}`, assessmentId, assessmentYear, aspectId: aspect.id, indicatorId: filteredData[iIdx].id,
        parameterId: parameter.id, factorId: targetFactorId, parameterName: parameter.parameterName, targetDivisi: requestDivisi,
        requestedBy: user?.name || 'Auditor', requestDate: new Date().toLocaleDateString('id-ID'), note: requestNote
      };
      await fetchApi('/document-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      showNotification('success', 'Tagihan dokumen terkirim ke Auditee!');
      setRequestDivisi(''); setRequestNote(''); fetchData(); if (onInteraction) onInteraction();
    }
  };

  const handleVerifyApprove = async (evidenceId: string, parameterId: string, factorId?: string) => {
    if (isReadOnly) return;
    await fetchApi(`/evidences/${evidenceId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Verified' }) });
    const reqsToUpdate = dbRequests.filter(r => r.assessmentId === assessmentId && r.parameterId === parameterId && (factorId ? r.factorId === factorId : true));
    for (const req of reqsToUpdate) {
      await fetchApi(`/document-requests/${req.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Verified', note: '' }) });
    }
    showNotification('success', 'Dokumen disetujui (Verified)!'); fetchData(); if (onInteraction) onInteraction();
  };

  const handleVerifyReject = async (evidenceId: string, parameterId: string, factorId?: string) => {
    if (isReadOnly) return;
    if (!rejectNoteInput.trim()) return showNotification('error', "Alasan penolakan / revisi harus diisi!");
    await fetchApi(`/evidences/${evidenceId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Rejected' }) });
    const reqsToUpdate = dbRequests.filter(r => r.assessmentId === assessmentId && r.parameterId === parameterId && (factorId ? r.factorId === factorId : true));
    for (const req of reqsToUpdate) {
      await fetchApi(`/document-requests/${req.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Rejected', note: rejectNoteInput }) });
    }
    setRejectingId(null); setRejectNoteInput(''); showNotification('success', 'Dokumen ditolak, revisi dikirim ke Auditee.'); fetchData(); if (onInteraction) onInteraction();
  };

  const handleLinkFromArchive = async (ev: EvidenceFile) => {
    if (!drawerConfig.data) return;
    if (window.confirm(`Gunakan dokumen "${ev.fileName}" untuk FUK ini?`)) {
      try {
        const newId = `EV-${Date.now()}`;
        const indicators = assessmentData[aspect.id] || [];
        const res = await fetchApi(`/evidences/${ev.id}/link-to-fuk`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newAspectId: aspect.id, newIndicatorId: indicators[drawerConfig.iIdx!].id, newParameterId: indicators[drawerConfig.iIdx!].parameters[drawerConfig.pIdx!].id, newFactorId: drawerConfig.data.id, newId: newId })
        });
        if (res.ok) {
          fetchData(); if (onInteraction) onInteraction(); setIsArchivePickerOpen(false); showNotification('success', 'Dokumen arsip berhasil disalin.');
        } else showNotification('error', 'Gagal menyalin dokumen.');
      } catch (err) { showNotification('error', 'Terjadi kesalahan server.'); }
    }
  };

  const colDefinitions = [
    { key: 'noInd', label: 'No. Indikator' },
    { key: 'indikator', label: 'Indikator' },
    { key: 'bobotInd', label: 'Bobot Indikator' },
    { key: 'noPar', label: 'No. Parameter' },
    { key: 'parameter', label: 'Parameter' },
    { key: 'bobotPar', label: 'Bobot Parameter' },
    { key: 'uji', label: 'No. FUK' },
    { key: 'faktorUji', label: 'Faktor Uji' },
    { key: 'subFaktorUji', label: 'Sub-Faktor Uji' },
    { key: 'keterangan', label: 'Keterangan/Temuan' },
    { key: 'evidence', label: 'Evidence (Bukti)' },
    { key: 'inputNilai', label: 'Input Nilai' },
    { key: 'skorUji', label: 'Skor FUK' },
    { key: 'skorPar', label: 'Skor Parameter' },
    { key: 'rekomendasi', label: 'Rekomendasi TL' },
    { key: 'targetTl', label: 'Target TL & PIC' },
    { key: 'skorInd', label: 'Skor Indikator' },
    { key: 'skorAsp', label: 'Skor Aspek' },
  ];

  return (
    <div className="space-y-4 pb-10 animate-in fade-in duration-300 w-full min-w-0 font-sans relative">
      
      {/* TOAST NOTIFICATION LOKAL KERTAS KERJA */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-[500] px-5 py-3.5 rounded-2xl border flex items-center space-x-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300 ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <AlertTriangle size={20} strokeWidth={2.5} />}
          <span className="font-bold text-[11px] uppercase tracking-widest">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-4 p-1.5 hover:bg-white/50 rounded-lg transition-colors"><X size={16} strokeWidth={3}/></button>
        </div>
      )}

      {/* COMPACT HEADER CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-center text-left gap-4 relative overflow-hidden">
        <div className="flex items-center space-x-4 relative z-10">
          <button onClick={onBack} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-200 transition-colors shadow-sm"><ChevronLeft size={20} strokeWidth={2.5} /></button>
          <div className={`p-3 rounded-xl shadow-sm flex items-center justify-center ${aspect?.color || 'bg-indigo-100 text-indigo-600'}`}>
            {aspect?.icon && React.isValidElement(aspect.icon) ? React.cloneElement(aspect.icon as React.ReactElement, { size: 24 } as any) : <Layers size={24} />}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">{aspect?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Kertas Kerja TB {assessmentYear}</span>
              {isReadOnly && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-amber-200 flex items-center gap-1"><Lock size={10} /> Read-Only</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-inner relative z-10 w-full md:w-auto">
          <div className="text-center px-5 py-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Skor Aspek</p>
            <p className="text-xl font-black text-indigo-600 leading-none mt-1">{displayData.length > 0 ? Number(displayData[0].aspectScore || 0).toFixed(3) : "0.000"}</p>
          </div>
          <div className="w-px h-8 bg-slate-300"></div>
          <div className="text-center px-5 py-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bobot Maks</p>
            <p className="text-xl font-black text-slate-400 leading-none mt-1">{Number(masterAspectBobot || 0).toFixed(3)}</p>
          </div>
        </div>
      </div>

      {/* SMART TOOLBAR (SEARCH & FILTER KOLOM FULL) */}
      <div className="bg-white p-3 px-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 relative z-[60]">
        
        {/* Search Universal */}
        <div className="flex items-center w-full sm:w-auto relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search size={16}/></div>
          <input 
            type="text" 
            placeholder="Cari Indikator, Parameter, atau Faktor..." 
            className="w-full sm:w-[350px] bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-500 text-slate-700 text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Dropdown Tampilan Semua Kolom */}
        <div className="flex items-center gap-3 relative">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Filter Tabel:</span>
          
          <button 
            onClick={() => setShowColDropdown(!showColDropdown)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all shadow-sm active:scale-95 text-[10px] font-black uppercase tracking-widest ${showColDropdown ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}
          >
            <Filter size={16} strokeWidth={2.5}/> Tampilan Kolom <ChevronDown size={14} className={showColDropdown ? "rotate-180 transition-transform" : "transition-transform"}/>
          </button>

          {showColDropdown && (
            <div className="absolute right-0 top-full mt-2 w-[480px] bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-3 flex flex-col animate-in slide-in-from-top-2">
              <div className="px-2 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-2 flex justify-between items-center">
                <span>Centang untuk menampilkan ({totalVisibleCols} Aktif)</span>
                <button 
                  className="text-indigo-600 hover:text-indigo-800 transition-colors"
                  onClick={() => setShowCols({
                    noInd: true, indikator: true, bobotInd: true, noPar: true, parameter: true, bobotPar: true, uji: true, faktorUji: true, subFaktorUji: true, keterangan: true, evidence: true, inputNilai: true, skorUji: true, skorPar: true, rekomendasi: true, targetTl: true, skorInd: true, skorAsp: true
                  })}
                >
                  Reset Semua
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                {colDefinitions.map(col => (
                  <label key={col.key} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                    <input 
                      type="checkbox" 
                      checked={showCols[col.key as keyof typeof showCols]} 
                      onChange={() => setShowCols(p => ({ ...p, [col.key]: !p[col.key as keyof typeof showCols] }))} 
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className={`text-xs font-bold ${showCols[col.key as keyof typeof showCols] ? 'text-indigo-700' : 'text-slate-500 group-hover:text-slate-700'}`}>
                      {col.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DENSE TABLE KERTAS KERJA */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full relative">
        <div className="overflow-x-auto w-full custom-scrollbar relative">
          <table className="w-full text-left text-xs whitespace-nowrap min-w-[2000px]">
            <thead ref={theadRef} className="sticky top-0 z-[40]">
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-widest font-black shadow-sm">
                {showCols.noInd && <th className="px-3 py-4 border-r border-slate-200 text-center w-16">No. Ind</th>}
                {showCols.indikator && <th className="px-3 py-4 border-r border-slate-200 w-56">Indikator</th>}
                {showCols.bobotInd && <th className="px-3 py-4 border-r border-slate-200 text-center w-16">Bobot</th>}
                
                {showCols.noPar && <th className="px-3 py-4 border-r border-slate-200 text-center w-16">No. Par</th>}
                {showCols.parameter && <th className="px-3 py-4 border-r border-slate-200 w-56">Parameter</th>}
                {showCols.bobotPar && <th className="px-3 py-4 border-r border-slate-200 text-center w-16">Bobot</th>}
                
                {showCols.uji && <th className="px-3 py-4 border-r border-slate-200 text-center w-12">Uji</th>}
                {showCols.faktorUji && <th className="px-3 py-4 border-r border-slate-200 w-64">Faktor Uji</th>}
                {showCols.subFaktorUji && <th className="px-3 py-4 border-r border-slate-200 w-72">Sub-Faktor Uji</th>}
                
                {showCols.keterangan && <th className="px-3 py-4 border-r border-slate-200 w-64 bg-indigo-50 text-indigo-700">✏️ Keterangan / Temuan</th>}
                {showCols.evidence && <th className="px-3 py-4 border-r border-slate-200 text-center w-28 bg-blue-50 text-blue-700">Evidence (Bukti)</th>}
                
                {showCols.inputNilai && <th className="px-3 py-4 border-r border-slate-200 text-center w-24 bg-fuchsia-50 text-fuchsia-700">✏️ Input Nilai</th>}
                {showCols.skorUji && <th className="px-3 py-4 border-r border-slate-200 text-center w-16 text-emerald-700 bg-emerald-50">Skor Uji</th>}
                {showCols.skorPar && <th className="px-3 py-4 border-r border-slate-200 text-center w-16 text-indigo-700 bg-indigo-50">Skor Par</th>}
                
                {showCols.rekomendasi && <th className="px-3 py-4 border-r border-slate-200 w-64 bg-amber-50 text-amber-700">✏️ Rekomendasi TL</th>}
                {showCols.targetTl && <th className="px-3 py-4 border-r border-slate-200 w-48 bg-orange-50 text-orange-700">✏️ Target TL & PIC</th>}
                
                {showCols.skorInd && <th className="px-3 py-4 border-r border-slate-200 text-center w-16 text-emerald-700 bg-emerald-50">Skor Ind</th>}
                {showCols.skorAsp && <th className="px-3 py-4 text-center w-16 text-emerald-700 bg-emerald-50">Skor Asp</th>}
              </tr>

              {/* STICKY CONTEXT HEADER (MUNCUL SAAT ROW LEWAT DI BAWAH THEAD) */}
              {(activeContext.ind || activeContext.param) && totalVisibleCols > 0 && (
                <tr className="bg-indigo-900/95 backdrop-blur-sm text-white shadow-md border-b border-indigo-700 animate-in slide-in-from-top-2">
                  <th colSpan={totalVisibleCols} className="px-5 py-2.5 text-left text-[11px] font-medium tracking-wide relative">
                    <div className="flex items-center gap-6">
                      {activeContext.ind && (
                        <span className="flex items-center gap-2">
                          <span className="opacity-60 uppercase font-black text-[9px] tracking-widest bg-indigo-800 px-2 py-0.5 rounded">Indikator</span> 
                          <strong className="font-bold text-indigo-100">{activeContext.ind}</strong>
                        </span>
                      )}
                      {activeContext.param && (
                        <span className="flex items-center gap-2 border-l border-indigo-700 pl-6">
                          <span className="opacity-60 uppercase font-black text-[9px] tracking-widest bg-indigo-800 px-2 py-0.5 rounded">Parameter</span> 
                          <strong className="font-bold text-indigo-100">{activeContext.param}</strong>
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              )}
            </thead>
            
            <tbody className="text-xs text-slate-700">
              {filteredData.length === 0 && totalVisibleCols > 0 && (
                <tr>
                  <td colSpan={totalVisibleCols} className="px-4 py-16 text-center text-slate-400 font-bold bg-slate-50/50">
                    <div className="flex flex-col items-center gap-3">
                      <Search size={40} className="text-slate-300" strokeWidth={1.5} />
                      <p className="text-sm">Tidak ada data yang cocok dengan pencarian.</p>
                    </div>
                  </td>
                </tr>
              )}
              {filteredData.map((indicator: IndicatorData, iIdx: number) => {
                
                const isIndCollapsed = collapsed[indicator.id];
                let totalRowsInIndicator = 0;

                if (isIndCollapsed) {
                  totalRowsInIndicator = 1;
                } else {
                  indicator.parameters.forEach(p => {
                    if (collapsed[p.id]) totalRowsInIndicator += 1;
                    else totalRowsInIndicator += Math.max(1, p.factors.length);
                  });
                  totalRowsInIndicator = Math.max(1, totalRowsInIndicator);
                }

                // ==========================================
                // RENDER: INDIKATOR COLLAPSED
                // ==========================================
                if (isIndCollapsed) {
                  return (
                    <tr key={`ind-${indicator.id}`} id={`ind-${indicator.id}`} className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-100 transition-colors shadow-inner">
                      {showCols.noInd && (
                        <td className="px-3 py-3 border-r border-slate-200 text-center font-black text-indigo-600 cursor-pointer bg-indigo-50 hover:bg-indigo-100" onClick={() => toggleCollapse(indicator.id)}>
                          <div className="flex items-center justify-center gap-1.5"><ChevronRight size={16} strokeWidth={3}/> {indicator._displayNum}</div>
                        </td>
                      )}
                      {showCols.indikator && <td className="px-3 py-3 border-r border-slate-200 font-bold text-slate-800">{indicator.indicatorName}</td>}
                      {showCols.bobotInd && <td className="px-3 py-3 border-r border-slate-200 text-center font-black text-amber-500">{Number(indicator.bobot || 0).toFixed(3)}</td>}
                      
                      {indColSpan > 0 && (
                        <td colSpan={indColSpan} className="px-3 py-3 text-center text-slate-400 font-bold cursor-pointer hover:text-indigo-600 transition-colors bg-white/50" onClick={() => toggleCollapse(indicator.id)}>
                          <div className="flex justify-center items-center gap-2"><Layers size={14}/> Indikator dilipat. Klik untuk melihat Parameter.</div>
                        </td>
                      )}
                      
                      {showCols.skorInd && <td className="px-3 py-3 border-l border-slate-200 text-center font-black text-emerald-500 bg-white">{Number(indicator.indicatorScore || 0).toFixed(3)}</td>}
                      {showCols.skorAsp && <td className="px-3 py-3 text-center font-black text-emerald-600 bg-emerald-50/50">{Number(indicator.aspectScore || 0).toFixed(3)}</td>}
                    </tr>
                  );
                }

                // ==========================================
                // RENDER: INDIKATOR NORMAL
                // ==========================================
                return indicator.parameters.map((param: ParameterData, pIdx: number) => {
                  const isParamCollapsed = collapsed[param.id];
                  const totalRowsInParam = isParamCollapsed ? 1 : Math.max(1, param.factors.length);
                  const isFirstInIndicator = pIdx === 0;

                  // ==========================================
                  // RENDER: PARAMETER COLLAPSED
                  // ==========================================
                  if (isParamCollapsed) {
                    return (
                      <tr key={`param-${param.id}`} id={isFirstInIndicator ? `ind-${indicator.id}` : undefined} className="border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors">
                        {isFirstInIndicator && (
                          <React.Fragment>
                            {showCols.noInd && (
                              <td rowSpan={totalRowsInIndicator} className="px-3 py-3 border-r border-slate-100 text-center font-black text-indigo-600 cursor-pointer bg-white hover:bg-indigo-50 align-top" onClick={() => toggleCollapse(indicator.id)}>
                                <div className="flex items-center justify-center gap-1.5"><ChevronDown size={16} strokeWidth={3}/> {indicator._displayNum}</div>
                              </td>
                            )}
                            {showCols.indikator && <td rowSpan={totalRowsInIndicator} className="px-3 py-3 border-r border-slate-100 font-bold text-slate-800 align-top whitespace-normal">{indicator.indicatorName}</td>}
                            {showCols.bobotInd && <td rowSpan={totalRowsInIndicator} className="px-3 py-3 border-r border-slate-100 text-center font-black text-amber-500 align-top">{Number(indicator.bobot || 0).toFixed(3)}</td>}
                          </React.Fragment>
                        )}
                        
                        {showCols.noPar && (
                          <td className="px-3 py-3 border-r border-slate-100 text-center font-black text-indigo-500 bg-indigo-50/30 cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => toggleCollapse(param.id)}>
                            <div className="flex items-center justify-center gap-1"><ChevronRight size={14} strokeWidth={3}/> {param._displayNum}</div>
                          </td>
                        )}
                        {showCols.parameter && <td className="px-3 py-3 border-r border-slate-100 font-bold text-slate-700 whitespace-normal">{param.parameterName}</td>}
                        {showCols.bobotPar && <td className="px-3 py-3 border-r border-slate-100 text-center font-black text-indigo-500">{Number(param.bobot || 0).toFixed(3)}</td>}
                        
                        {paramColSpan1 > 0 && (
                          <td colSpan={paramColSpan1} className="px-3 py-3 text-center text-slate-400 font-medium bg-slate-50/50 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => toggleCollapse(param.id)}>
                            Parameter dilipat. Klik untuk melihat Faktor Uji.
                          </td>
                        )}
                        
                        {showCols.skorPar && <td className="px-3 py-3 border-l border-r border-slate-100 text-center font-black text-indigo-600">{Number(param.parameterScore || 0).toFixed(3)}</td>}
                        
                        {paramColSpan2 > 0 && <td colSpan={paramColSpan2} className="px-3 py-3 text-center text-slate-300 bg-slate-50/50">-</td>}

                        {isFirstInIndicator && (
                          <React.Fragment>
                            {showCols.skorInd && <td rowSpan={totalRowsInIndicator} className="px-3 py-3 border-r border-slate-100 text-center font-black text-emerald-500 align-top">{Number(indicator.indicatorScore || 0).toFixed(3)}</td>}
                            {showCols.skorAsp && <td rowSpan={totalRowsInIndicator} className="px-3 py-3 text-center font-black text-emerald-600 bg-emerald-50/30 align-top">{Number(indicator.aspectScore || 0).toFixed(3)}</td>}
                          </React.Fragment>
                        )}
                      </tr>
                    );
                  }

                  // ==========================================
                  // RENDER: PARAMETER & FAKTOR NORMAL
                  // ==========================================
                  return param.factors.map((factor: FactorData, fIdx: number) => {
                    const isFirstInParameter = fIdx === 0;
                    
                    const rawParamId = rawData[iIdx].parameters[pIdx].id;
                    const rawFactorId = factor.id;
                    const factorEvidences = dbEvidences?.filter(e => e.assessmentId === assessmentId && (e.factorId === rawFactorId || (e.parameterId === rawParamId && !e.factorId))) || [];
                    const factorRequests = dbRequests?.filter(r => r.assessmentId === assessmentId && (r.factorId === rawFactorId || (r.parameterId === rawParamId && !r.factorId))) || [];
                    const totalEvidences = factorEvidences.length + factorRequests.length;

                    let prevFactor: any = null;
                    let prevTaskStatus = 'Belum Ada Info';

                    if (prevAssessment && prevAssessment.data[aspect.id]) {
                      const pInd = prevAssessment.data[aspect.id].find((i: any) => i.id === rawData[iIdx].id);
                      if (pInd) {
                        const pParam = pInd.parameters.find((p: any) => p.id === rawParamId);
                        if (pParam) {
                          prevFactor = pParam.factors.find((f: any) => f.id === rawFactorId);
                          if (prevFactor && prevFactor.recommendation) {
                            const prevTaskId = `${prevAssessment.id}_${aspect.id}_${rawData[iIdx].id}_${rawParamId}_${rawFactorId}`;
                            prevTaskStatus = tlRecords[prevTaskId]?.status || 'Open';
                          }
                        }
                      }
                    }

                    const hasSubFactors = factor.subFactors && factor.subFactors.length > 0;

                    return (
                      <tr 
                        key={`fac-${iIdx}-${pIdx}-${fIdx}`} 
                        id={isFirstInIndicator && isFirstInParameter ? `ind-${indicator.id}` : undefined} 
                        className="border-b border-slate-100 hover:bg-indigo-50/20 align-top transition-colors group/row"
                        data-context="true"
                        data-ind-name={`${indicator._displayNum}. ${indicator.indicatorName}`}
                        data-param-name={`${param._displayNum}. ${param.parameterName}`}
                      >
                        
                        {isFirstInIndicator && isFirstInParameter && (
                          <React.Fragment>
                            {showCols.noInd && (
                              <td rowSpan={totalRowsInIndicator} className="px-3 py-3 border-r border-slate-100 text-center font-black text-indigo-600 bg-white cursor-pointer hover:bg-indigo-50 align-top" onClick={() => toggleCollapse(indicator.id)}>
                                <div className="flex items-center justify-center gap-1.5"><ChevronDown size={16} strokeWidth={3}/> {indicator._displayNum}</div>
                              </td>
                            )}
                            {showCols.indikator && <td rowSpan={totalRowsInIndicator} className="px-3 py-3 border-r border-slate-100 font-bold text-slate-800 bg-white whitespace-normal align-top">{indicator.indicatorName}</td>}
                            {showCols.bobotInd && <td rowSpan={totalRowsInIndicator} className="px-3 py-3 border-r border-slate-100 text-center font-black text-amber-500 bg-white align-top">{Number(indicator.bobot || 0).toFixed(3)}</td>}
                          </React.Fragment>
                        )}
                        
                        {isFirstInParameter && (
                          <React.Fragment>
                            {showCols.noPar && (
                              <td rowSpan={totalRowsInParam} className="px-3 py-3 border-r border-slate-100 text-center font-black text-indigo-500 bg-white cursor-pointer hover:bg-indigo-50 align-top" onClick={() => toggleCollapse(param.id)}>
                                <div className="flex items-center justify-center gap-1"><ChevronDown size={14} strokeWidth={3}/> {param._displayNum}</div>
                              </td>
                            )}
                            {showCols.parameter && <td rowSpan={totalRowsInParam} className="px-3 py-3 border-r border-slate-100 font-bold text-slate-700 bg-white whitespace-normal align-top">{param.parameterName}</td>}
                            {showCols.bobotPar && <td rowSpan={totalRowsInParam} className="px-3 py-3 border-r border-slate-100 text-center font-black text-indigo-500 bg-white align-top">{Number(param.bobot || 0).toFixed(3)}</td>}
                          </React.Fragment>
                        )}

                        {showCols.uji && <td className="px-3 py-3 border-r border-slate-100 text-center font-black text-slate-400 bg-white align-top pt-4">{factor._displayNum}</td>}
                        
                        {showCols.faktorUji && (
                          <td className="px-3 py-3 border-r border-slate-100 bg-white whitespace-normal align-top pt-4">
                            <p className="font-bold text-slate-800 leading-snug">{factor.name}</p>
                          </td>
                        )}

                        {showCols.subFaktorUji && (
                          <td className="px-3 py-3 border-r border-slate-100 bg-slate-50/30 whitespace-normal align-top">
                            {hasSubFactors ? (
                              <div className="space-y-2 mt-1">
                                {factor.subFactors!.map((sf, sfIndex) => (
                                  <div key={sf.id} className="relative bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm flex items-start gap-2 overflow-hidden hover:border-indigo-200 transition-colors">
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${(sf.subFactorScore || 0) >= 1.00 ? 'bg-emerald-500' : (sf.subFactorScore || 0) >= 0.75 ? 'bg-indigo-400' : (sf.subFactorScore || 0) >= 0.50 ? 'bg-amber-400' : (sf.subFactorScore || 0) > 0 ? 'bg-orange-400' : 'bg-slate-300'}`}></div>
                                    <span className="text-[11px] font-black text-slate-400 ml-1 shrink-0 mt-0.5">{sfIndex + 1}.</span>
                                    <div className="flex-1">
                                      <span className="font-semibold text-slate-700 text-[11px] leading-snug block">{sf.name}</span>
                                      {sf.description && <span className="text-slate-500 italic block mt-1 text-[9px] leading-tight">{sf.description}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full opacity-60 mt-1">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest border border-dashed border-slate-300 px-3 py-1.5 rounded-lg bg-slate-100/50">Penilaian Langsung di Tingkat Faktor</span>
                              </div>
                            )}
                          </td>
                        )}

                        {showCols.keterangan && (
                          <td className="px-2 py-2 border-r border-slate-100 bg-white whitespace-normal transition-all">
                            <InlineTextarea value={factor.description || ''} placeholder="Ketik keterangan / temuan auditor..." disabled={isReadOnly} onBlur={(newVal) => handleInlineUpdate(iIdx, pIdx, fIdx, 'description', newVal)} />
                          </td>
                        )}

                        {showCols.evidence && (
                          <td className="px-3 py-3 border-r border-slate-100 text-center bg-white align-top pt-4 transition-all">
                            <button onClick={() => openDrawer(iIdx, pIdx, fIdx)} className={`w-full py-2.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 border ${totalEvidences > 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800'}`}>
                              <FolderOpen size={14} strokeWidth={2.5}/> Kelola Bukti ({totalEvidences})
                            </button>
                          </td>
                        )}

                        {showCols.inputNilai && (
                          <td className="px-3 py-3 border-r border-slate-100 text-center bg-white align-top pt-4">
                            {hasSubFactors ? (
                              <button disabled={isReadOnly} onClick={() => setSubFactorModal({ show: true, iIdx, pIdx, fIdx, subFactors: [...factor.subFactors!] })} className="w-full text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-600 hover:text-white px-2 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50 active:scale-95">Set Sub-Faktor</button>
                            ) : (
                              <select disabled={isReadOnly} className={`w-full text-center text-xs font-black p-2 border rounded-lg outline-none transition-all cursor-pointer shadow-sm disabled:opacity-70 ${(Number(factor.factorScore) || 0) > 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-200 focus:ring-2 focus:ring-indigo-500/20' : 'bg-white text-slate-600 border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'}`} value={factor.factorScore || 0} onChange={(e) => handleInlineUpdate(iIdx, pIdx, fIdx, 'factorScore', Number(e.target.value))}>
                                <option value={0.00}>0.00</option><option value={0.25}>0.25</option><option value={0.50}>0.50</option><option value={0.75}>0.75</option><option value={1.00}>1.00</option>
                              </select>
                            )}
                          </td>
                        )}

                        {showCols.skorUji && (
                          <td className="px-3 py-3 border-r border-slate-100 text-center bg-white align-top pt-4">
                            <span className={`px-2.5 py-1.5 text-[11px] font-black rounded-lg shadow-sm border block ${(Number(factor.factorScore) || 0) > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{Number(factor.factorScore || 0).toFixed(2)}</span>
                          </td>
                        )}

                        {isFirstInParameter && showCols.skorPar && (
                          <td rowSpan={totalRowsInParam} className="px-3 py-3 border-r border-slate-100 text-center font-black text-indigo-600 bg-white align-top pt-5">{Number(param.parameterScore || 0).toFixed(3)}</td>
                        )}

                        {showCols.rekomendasi && (
                          <td className="px-2 py-2 border-r border-slate-100 bg-white whitespace-normal relative transition-all">
                            <InlineTextarea value={factor.recommendation || ''} placeholder="Ketik rekomendasi tindak lanjut..." disabled={isReadOnly} onBlur={(newVal) => handleInlineUpdate(iIdx, pIdx, fIdx, 'recommendation', newVal)} />
                            {prevFactor && prevFactor.recommendation && (
                              <div className="mt-2 mx-1 p-2 bg-amber-50 border border-amber-200 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between mb-1.5 border-b border-amber-200/50 pb-1">
                                  <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1"><HistoryIcon size={8} /> Rekom. {prevAssessment.year}</p>
                                  <span className={`text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded border ${prevTaskStatus === 'Closed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : prevTaskStatus === 'Submitted' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>{prevTaskStatus}</span>
                                </div>
                                <p className="text-[9px] text-amber-900 font-semibold italic line-clamp-2 leading-tight" title={prevFactor.recommendation}>"{prevFactor.recommendation}"</p>
                              </div>
                            )}
                          </td>
                        )}

                        {showCols.targetTl && (
                          <td className="px-3 py-3 border-r border-slate-100 bg-white whitespace-normal align-top pt-4 transition-all">
                            <div className="flex flex-col gap-2 relative">
                              <div className="relative group/pic z-10 hover:z-50">
                                <div className={`w-full text-[10px] font-bold p-1.5 border rounded outline-none flex justify-between items-center min-h-[28px] transition-colors shadow-sm ${isReadOnly ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-amber-400 text-slate-700 cursor-pointer'}`}>
                                  <span className="truncate leading-tight max-w-[120px]">{factor.picDivisi ? factor.picDivisi : '-- Pilih PIC --'}</span>
                                  <ChevronDown size={12} className="text-slate-400 shrink-0 ml-1"/>
                                </div>
                                {!isReadOnly && (
                                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 shadow-xl rounded-xl p-2 hidden group-hover/pic:flex flex-col gap-1 max-h-[220px] overflow-y-auto custom-scrollbar">
                                    <div className="flex gap-1 mb-1 pb-1.5 border-b border-slate-100">
                                      <button type="button" onClick={() => handleInlineUpdate(iIdx, pIdx, fIdx, 'picDivisi', divisions.join(' | '))} className="text-[8px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-1.5 rounded-lg w-1/2 transition-colors border border-indigo-100">Pilih Semua</button>
                                      <button type="button" onClick={() => handleInlineUpdate(iIdx, pIdx, fIdx, 'picDivisi', '')} className="text-[8px] font-black text-slate-500 bg-slate-100 hover:bg-slate-200 px-1.5 py-1.5 rounded-lg w-1/2 transition-colors border border-slate-200">Reset</button>
                                    </div>
                                    {divisions.map(div => {
                                      let selectedArr: string[] = [];
                                      if (factor.picDivisi) {
                                        if (factor.picDivisi.includes('|')) selectedArr = factor.picDivisi.split('|').map(s => s.trim());
                                        else if (divisions.includes(factor.picDivisi.trim())) selectedArr = [factor.picDivisi.trim()];
                                        else selectedArr = factor.picDivisi.split(',').map(s => s.trim());
                                      }
                                      const isChecked = selectedArr.includes(div);
                                      return (
                                        <label key={div} className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors border ${isChecked ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-slate-50 border-transparent'}`}>
                                          <input type="checkbox" className="w-3 h-3 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 shrink-0" checked={isChecked} onChange={() => {
                                            let newArr = [...selectedArr];
                                            if (isChecked) newArr = newArr.filter(d => d !== div);
                                            else newArr.push(div);
                                            handleInlineUpdate(iIdx, pIdx, fIdx, 'picDivisi', newArr.join(' | '));
                                          }} />
                                          <span className={`text-[10px] leading-tight truncate ${isChecked ? 'font-bold text-indigo-700' : 'font-medium text-slate-600'}`}>{div}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <input disabled={isReadOnly} type="date" className="w-full text-[10px] font-bold p-1.5 border border-slate-200 rounded outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 bg-slate-50 hover:bg-white text-slate-700 disabled:opacity-60 cursor-pointer shadow-sm transition-colors" value={factor.dueDate || ''} onChange={(e) => handleInlineUpdate(iIdx, pIdx, fIdx, 'dueDate', e.target.value)} />
                            </div>
                          </td>
                        )}

                        {isFirstInIndicator && isFirstInParameter && (
                          <React.Fragment>
                            {showCols.skorInd && <td rowSpan={totalRowsInIndicator} className="px-3 py-3 border-r border-slate-100 text-center font-black text-emerald-500 bg-white align-top pt-5">{Number(indicator.indicatorScore || 0).toFixed(3)}</td>}
                            {showCols.skorAsp && <td rowSpan={totalRowsInIndicator} className="px-3 py-3 text-center font-black text-emerald-600 bg-emerald-50/30 align-top pt-5">{Number(indicator.aspectScore || 0).toFixed(3)}</td>}
                          </React.Fragment>
                        )}
                      </tr>
                    );
                  });
                });
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SISA MODAL & DRAWER TETAP SAMA */}
      
      {/* 1. MINI MODAL KHUSUS SUB-FAKTOR */}
      {subFactorModal.show && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-[0.98] duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
              <h2 className="font-black text-sm uppercase tracking-widest text-indigo-700 flex items-center gap-2"><Settings size={16} strokeWidth={3}/> Set Skor Sub-Faktor</h2>
              <button onClick={() => setSubFactorModal({ show: false, iIdx: null, pIdx: null, fIdx: null, subFactors: [] })} className="text-indigo-400 hover:text-indigo-700 transition-colors"><X size={18} strokeWidth={2.5}/></button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3">
              {subFactorModal.subFactors.map((sf, idx) => (
                <div key={sf.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors">
                  <div className="shrink-0">
                    <select
                      className="text-xs font-bold border border-slate-300 rounded-lg px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm cursor-pointer"
                      value={sf.subFactorScore || 0}
                      onChange={(e) => {
                        const updated = [...subFactorModal.subFactors];
                        updated[idx].subFactorScore = Number(e.target.value);
                        setSubFactorModal({ ...subFactorModal, subFactors: updated });
                      }}
                    >
                      <option value={0.00}>0.00 (0%)</option>
                      <option value={0.25}>0.25 (1-50%)</option>
                      <option value={0.50}>0.50 (51-74%)</option>
                      <option value={0.75}>0.75 (75-84%)</option>
                      <option value={1.00}>1.00 (≥85%)</option>
                    </select>
                  </div>
                  <span className="text-xs font-bold text-slate-700 leading-snug">{sf.name}</span>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setSubFactorModal({ show: false, iIdx: null, pIdx: null, fIdx: null, subFactors: [] })} className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-500 border border-slate-300 hover:bg-slate-100 transition-colors uppercase tracking-widest active:scale-95">Batal</button>
              <button onClick={handleSaveSubFactors} className="px-5 py-2.5 rounded-xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-colors uppercase tracking-widest shadow-md flex items-center gap-2 active:scale-95"><Save size={14}/> Simpan Skor</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SIDE DRAWER (PANEL KANAN) KHUSUS EVIDENCE & REQUEST */}
      {drawerConfig.show && drawerConfig.data && (
        <div className="fixed inset-0 z-[400] flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md h-full bg-slate-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 relative">
            <div className="px-6 py-5 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10 shrink-0">
              <div>
                <h2 className="font-black text-lg text-slate-800 uppercase tracking-tight flex items-center gap-2"><FolderOpen size={18} className="text-indigo-600"/> Manajemen Bukti</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 truncate w-64">{drawerConfig.data.name}</p>
              </div>
              <button onClick={closeDrawer} className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-xl transition-colors active:scale-90"><PanelRightClose size={20} strokeWidth={2.5}/></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5 border-b border-indigo-100 pb-2"><FileText size={14}/> Dokumen Terunggah</h3>
                {dbEvidences.filter(e => e.assessmentId === assessmentId && (e.factorId === drawerConfig.data!.id || (e.parameterId === rawData[drawerConfig.iIdx!].parameters[drawerConfig.pIdx!].id && !e.factorId))).length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4 bg-white rounded-xl border border-slate-200 shadow-sm">Belum ada dokumen.</p>
                )}
                {dbEvidences.filter(e => e.assessmentId === assessmentId && (e.factorId === drawerConfig.data!.id || (e.parameterId === rawData[drawerConfig.iIdx!].parameters[drawerConfig.pIdx!].id && !e.factorId))).map(ev => (
                  <div key={ev.id} className="flex flex-col p-4 bg-white border border-slate-200 rounded-xl shadow-sm relative group/ev">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 cursor-pointer hover:underline" onClick={() => setViewingDocument(ev)}>
                        <FileText size={14} className="shrink-0" />
                        <span className="truncate w-48" title={ev.fileName}>{ev.fileName}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Oleh: {ev.divisi}</span>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${ev.status === 'Verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ev.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                        {ev.status}
                      </span>
                    </div>
                    {!isReadOnly && (
                      <button type="button" onClick={(e) => handleDeleteEvidence(ev.id, e)} className="absolute right-2 top-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors opacity-0 group-hover/ev:opacity-100">
                        <Trash2 size={14} strokeWidth={2.5}/>
                      </button>
                    )}
                    {ev.status === 'Menunggu Verifikasi' && !isReadOnly && (
                      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3">
                        {rejectingId === ev.id ? (
                          <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95">
                            <input type="text" placeholder="Alasan tolak (Wajib)..." className="text-[10px] font-bold border border-rose-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-rose-500/20 bg-rose-50" value={rejectNoteInput} onChange={e => setRejectNoteInput(e.target.value)} />
                            <div className="flex gap-2">
                              <button type="button" onClick={() => handleVerifyReject(ev.id, ev.parameterId, ev.factorId)} className="flex-1 bg-rose-600 text-white text-[10px] py-2 rounded-lg font-black uppercase tracking-widest shadow-sm active:scale-95">Kirim Penolakan</button>
                              <button type="button" onClick={() => setRejectingId(null)} className="flex-1 bg-slate-100 text-slate-600 text-[10px] py-2 rounded-lg font-black uppercase tracking-widest shadow-sm active:scale-95 border border-slate-200">Batal</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleVerifyApprove(ev.id, ev.parameterId, ev.factorId)} className="flex-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-95">
                              <CheckCircle2 size={14} strokeWidth={2.5}/> Setujui
                            </button>
                            <button type="button" onClick={() => setRejectingId(ev.id)} className="flex-1 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 text-rose-700 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-95">
                              <AlertCircle size={14} strokeWidth={2.5}/> Tolak
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5 border-b border-amber-100 pb-2"><BellRing size={14}/> Tagihan Dokumen Menunggu</h3>
                {dbRequests.filter(req => req.assessmentId === assessmentId && req.parameterId === rawData[drawerConfig.iIdx!].parameters[drawerConfig.pIdx!].id && req.status === 'Requested').length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4 bg-white rounded-xl border border-slate-200 shadow-sm">Tidak ada tagihan aktif.</p>
                )}
                {dbRequests.filter(req => req.assessmentId === assessmentId && req.parameterId === rawData[drawerConfig.iIdx!].parameters[drawerConfig.pIdx!].id && req.status === 'Requested').map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-white border border-amber-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <BellRing size={14} className="text-amber-500 shrink-0" /> <span className="truncate w-32">Div: {req.targetDivisi}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded">Menunggu</span>
                      {!isReadOnly && (
                        <button onClick={(e) => handleDeleteRequest(req.id, e)} className="p-1.5 bg-rose-50 text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-100 hover:border-rose-500 rounded-lg transition-colors shadow-sm" title="Batal Tagih">
                          <Trash2 size={12} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {!isReadOnly && (
              <div className="p-5 bg-white border-t border-slate-200 shrink-0 space-y-4 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] z-10">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 hover:border-indigo-500 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded-xl py-3 cursor-pointer transition-all shadow-sm active:scale-95">
                    <UploadCloud size={16} strokeWidth={2.5} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Upload Baru</span>
                    <input type="file" accept=".pdf, .xls, .xlsx" className="hidden" onChange={handleUploadOlehAuditor} />
                  </label>
                  <button type="button" onClick={() => setIsArchivePickerOpen(true)} className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 hover:border-slate-500 hover:bg-slate-700 hover:text-white text-slate-600 rounded-xl py-3 transition-all shadow-sm active:scale-95">
                    <HistoryIcon size={16} strokeWidth={2.5} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Cari Arsip</span>
                  </button>
                </div>
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                  <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5 mb-2"><BellRing size={12}/> Tagih Ke Divisi</label>
                  <textarea className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 bg-white placeholder:text-slate-300 custom-scrollbar h-16 resize-none mb-2 shadow-sm" placeholder="Catatan dokumen yang dibutuhkan..." value={requestNote} onChange={e => setRequestNote(e.target.value)} />
                  <div className="flex gap-2">
                    <select className="flex-1 text-[10px] font-bold px-3 py-2 border border-slate-200 rounded-xl outline-none bg-white text-slate-700 shadow-sm cursor-pointer" value={requestDivisi} onChange={e => setRequestDivisi(e.target.value)}>
                      <option value="">-- Pilih Divisi --</option>
                      {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <button type="button" onClick={handleRequestDocument} className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest px-4 rounded-xl transition-transform shadow-md shadow-amber-500/20 active:scale-95 flex items-center gap-1.5">
                      Tagih <ChevronRight size={14} strokeWidth={3}/>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. MODAL DOCUMENT VIEWER (PREMIUM) */}
      {viewingDocument && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-[0.98] duration-200 border border-slate-700">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0 shadow-md z-10 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl"><FileText size={20} className="text-indigo-400" /></div>
                <div>
                  <h2 className="text-sm font-bold truncate max-w-md leading-tight text-slate-100">{viewingDocument.fileName}</h2>
                  <p className="text-[9px] text-slate-400 font-black mt-1 uppercase tracking-widest bg-slate-800 px-2 py-0.5 rounded-md inline-block border border-slate-700">Oleh: {viewingDocument.divisi}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {viewingDocument.fileUrl && (
                  <a href={viewingDocument.fileUrl.replace(/^http:\/\//i, 'https://')} target="_blank" download className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95 border border-indigo-500">
                    <Download size={14} strokeWidth={3}/> Unduh File
                  </a>
                )}
                <button onClick={() => setViewingDocument(null)} className="p-2.5 text-slate-400 hover:text-white hover:bg-rose-500 rounded-xl transition-colors border border-transparent hover:border-rose-600 active:scale-95">
                  <X size={18} strokeWidth={3}/>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center pattern-grid-lg text-slate-200">
              {viewingDocument.fileUrl && viewingDocument.fileUrl.endsWith('.pdf') ? (
                <iframe src={viewingDocument.fileUrl.replace(/^http:\/\//i, 'https://')} title={viewingDocument.fileName} className="w-full h-full border-none bg-white"></iframe>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center max-w-md bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200 shadow-xl">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-5 shadow-inner">
                    <AlertCircle size={40} className="text-slate-300" strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-2 truncate w-full px-4">{viewingDocument.fileName}</h3>
                  <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-6">Pratinjau langsung di dalam aplikasi hanya tersedia untuk file berformat PDF. Silakan unduh file untuk melihat isinya.</p>
                  <a href={viewingDocument.fileUrl ? viewingDocument.fileUrl.replace(/^http:\/\//i, 'https://') : '#'} target="_blank" download className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95">
                    <Download size={14} strokeWidth={3}/> Unduh Sekarang
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL ARCHIVE PICKER */}
      {isArchivePickerOpen && drawerConfig.data && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-[0.98] duration-200 border border-slate-200">
            <div className="bg-slate-900 px-8 py-5 flex justify-between items-center text-white shrink-0 shadow-md">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl">
                  <HistoryIcon size={18} className="text-indigo-400" strokeWidth={2.5}/>
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-100">Kloning Dokumen Arsip</h2>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-wider">Tarik bukti dari Tahun Buku {assessmentYear} / lainnya</p>
                </div>
              </div>
              <button onClick={() => setIsArchivePickerOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-slate-700 active:scale-95">
                <X size={18} strokeWidth={3}/>
              </button>
            </div>
            
            <div className="p-5 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="relative max-w-xl mx-auto">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama file atau divisi pengunggah..."
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-bold text-slate-700 shadow-sm transition-all"
                  value={archiveSearch}
                  onChange={e => setArchiveSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar bg-slate-50/50">
              {dbEvidences.filter(e => e.assessmentId === assessmentId && e.factorId !== drawerConfig.data!.id).filter(e => archiveSearch ? e.fileName.toLowerCase().includes(archiveSearch.toLowerCase()) || e.divisi.toLowerCase().includes(archiveSearch.toLowerCase()) : true).length === 0 ? (
                <div className="text-center p-16 flex flex-col items-center justify-center h-full">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <HistoryIcon size={32} className="text-slate-300" strokeWidth={2}/>
                  </div>
                  <h3 className="text-lg font-black text-slate-700 mb-1">Arsip Tidak Ditemukan</h3>
                  <p className="text-slate-500 text-xs font-medium max-w-sm">Pastikan Anda mengetik kata kunci yang benar atau dokumen arsip memang belum tersedia.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {dbEvidences.filter(e => e.assessmentId === assessmentId && e.factorId !== drawerConfig.data!.id).filter(e => archiveSearch ? e.fileName.toLowerCase().includes(archiveSearch.toLowerCase()) || e.divisi.toLowerCase().includes(archiveSearch.toLowerCase()) : true).map(e => (
                    <div key={e.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100 transition-all group">
                      <div>
                        <div className="flex items-start gap-3 mb-4">
                          <div className="p-2 bg-slate-50 text-slate-400 rounded-lg border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors shrink-0">
                            <FileText size={18} strokeWidth={2.5}/>
                          </div>
                          <div>
                            <span className="text-xs font-bold leading-snug line-clamp-2 text-slate-800 group-hover:text-indigo-700 transition-colors" title={e.fileName}>{e.fileName}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1 block">Divisi: {e.divisi}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                            e.status === 'Verified' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                            e.status === 'Rejected' ? 'text-rose-600 bg-rose-50 border-rose-100' :
                            e.status === 'Menunggu Verifikasi' || e.status === 'Pending' ? 'text-amber-600 bg-amber-50 border-amber-100' :
                            'text-slate-500 bg-slate-100 border-slate-200'
                          }`}>
                            {e.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                        <div className="flex gap-2 flex-1">
                          <button type="button" onClick={() => setViewingDocument(e)} className="flex-1 bg-slate-50 hover:bg-slate-800 text-slate-600 hover:text-white border border-slate-200 hover:border-slate-800 font-black text-[9px] uppercase tracking-widest py-2 rounded-xl transition-all flex justify-center items-center gap-1.5 shadow-sm active:scale-95">
                            <Eye size={14} strokeWidth={2.5}/> Lihat
                          </button>
                        </div>
                        <button type="button" onClick={() => handleLinkFromArchive(e)} className="flex-[2] bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 font-black text-[9px] uppercase tracking-widest py-2 rounded-xl transition-all flex justify-center items-center gap-1.5 shadow-sm active:scale-95">
                          <Copy size={14} strokeWidth={2.5}/> Salin ke FUK Ini
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default KertasKerja;