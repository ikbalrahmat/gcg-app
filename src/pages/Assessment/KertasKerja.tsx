import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, Edit2, Target, FileText, CheckCircle, Save, Layers, X, UploadCloud, BellRing, Clock, AlertCircle, History as HistoryIcon, Copy, ExternalLink, Download, Trash2, Eye, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react'; 
import type { EvidenceFile, DocumentRequest } from '../../types';

export interface SubFactorData { id: string; name: string; description?: string; isFulfilled?: boolean; }
export interface FactorData { id: string; name: string; description: string; subFactors?: SubFactorData[]; factorScore: number; recommendation: string; picDivisi?: string; dueDate?: string; picAuditor?: string; }
export interface ParameterData { id: string; parameterName: string; bobot?: number; parameterScore: number; fulfillment: number; factors: FactorData[]; }
export interface IndicatorData { id: string; indicatorName: string; bobot?: number; indicatorScore: number; aspectScore: number; parameters: ParameterData[]; }
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
}

interface ModalConfig { show: boolean; type: 'factor' | ''; iIdx: number | null; pIdx: number | null; fIdx: number | null; data: any; }

const calculateFactorScoreSK16 = (percentage: number): number => {
  if (percentage === 0) return 0.00;
  if (percentage > 0 && percentage < 50) return 0.25; 
  if (percentage >= 50 && percentage < 75) return 0.50;
  if (percentage >= 75 && percentage < 85) return 0.75;
  return 1.00; 
};

const KertasKerja: React.FC<KertasKerjaProps> = ({ 
  assessmentId, assessmentYear, aspect, masterAspectBobot, onBack, assessmentData, setAssessmentData, isReadOnly = false, onInteraction 
}) => {
  const { user } = useAuth();
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ show: false, type: '', iIdx: null, pIdx: null, fIdx: null, data: {} });
  const [requestDivisi, setRequestDivisi] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [divisions, setDivisions] = useState<string[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNoteInput, setRejectNoteInput] = useState('');
  const [viewingDocument, setViewingDocument] = useState<EvidenceFile | null>(null);

  const [dbEvidences, setDbEvidences] = useState<EvidenceFile[]>([]);
  const [dbRequests, setDbRequests] = useState<DocumentRequest[]>([]);
  const [prevAssessment, setPrevAssessment] = useState<any>(null);
  const [tlRecords, setTlRecords] = useState<any>({});

  

  const fetchData = async () => {
    const headers = {  'Accept': 'application/json' };
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
        const data = await resAss.json();
        if(Array.isArray(data)) {
          const pAss = data.find((a: any) => String(a.year) === String(Number(assessmentYear) - 1) && a.status !== 'Draft');
          setPrevAssessment(pAss);
        }
      }
    } catch(e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, [assessmentYear]);

  const data = assessmentData ? (assessmentData[aspect?.id] || []) : [];

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

  const openModal = (type: 'factor', iIdx: number | null = null, pIdx: number | null = null, fIdx: number | null = null) => {
    if (fIdx !== null && pIdx !== null && iIdx !== null) {
      setModalConfig({ show: true, type, iIdx, pIdx, fIdx, data: data[iIdx]?.parameters[pIdx]?.factors[fIdx] || {} });
      setRequestDivisi(''); setRequestNote(''); setRejectingId(null); setRejectNoteInput('');
    }
  };
  
  const closeModal = () => setModalConfig({ show: false, type: '', iIdx: null, pIdx: null, fIdx: null, data: {} });

  // 🔧 FIX: handleSave sekarang mengirim payload ke backend
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if(isReadOnly) return;
    const newData = [...data];
    const { iIdx, pIdx, fIdx, data: formData } = modalConfig;
    if (iIdx !== null && pIdx !== null && fIdx !== null) { 
      newData[iIdx].parameters[pIdx].factors[fIdx] = { ...newData[iIdx].parameters[pIdx].factors[fIdx], ...formData, picAuditor: user?.name || 'Auditor' }; 
    }
    
    const updatedData = calculateScores(newData);
    const newAssessmentData = { ...assessmentData, [aspect.id]: updatedData };
    
    // 1. Update Tampilan React Lokal
    setAssessmentData(newAssessmentData);
    
    // 2. Tembak API Laravel untuk Simpan Data Kertas Kerja & Update Status
    try {
      const response = await fetchApi(`/assessments/${assessmentId}/data`, {
        method: 'PUT',
        headers: { 
           
          'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: newAssessmentData,
          status: 'Proses' // <--- Baris ini yang mengubah status ke Proses di database
        })
      });

      if (!response.ok) {
        throw new Error('Gagal menyimpan ke database');
      }
    } catch (err) {
      console.error("Gagal simpan ke API:", err);
      alert("Terjadi kesalahan saat menyimpan kertas kerja ke server.");
    }

    if(onInteraction) onInteraction(); 
    closeModal();
  };

  const handleUploadOlehAuditor = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && !isReadOnly) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) return alert(`Gagal: Ukuran file terlalu besar! Maksimal 10MB.`);
      
      const { iIdx, pIdx } = modalConfig;
      if (iIdx !== null && pIdx !== null) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('id', `EV-${Date.now()}`);
        formData.append('assessmentId', assessmentId);
        formData.append('assessmentYear', assessmentYear);
        formData.append('aspectId', aspect.id);
        formData.append('indicatorId', data[iIdx].id);
        formData.append('parameterId', data[iIdx].parameters[pIdx].id);
        formData.append('divisi', 'Auditor (Internal)');
        formData.append('uploadDate', new Date().toISOString().split('T')[0]);

        try {
          const response = await fetchApi('/evidences', { 
            method: 'POST', 
            body: formData 
          });

          if (!response.ok) {
            const errorData = await response.json();
            alert(`Gagal upload file: ${errorData.message || 'Error Server'}`);
            return;
          }

          fetchData();
          if(onInteraction) onInteraction();
        } catch(err) { 
          alert("Gagal koneksi ke server untuk upload dokumen."); 
        }
      }
    }
  };

  const handleDeleteEvidence = async (evidenceId: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (isReadOnly) return;
    if (window.confirm("Yakin ingin menghapus dokumen ini dari server?")) {
      await fetchApi(`/evidences/${evidenceId}`, { method: 'DELETE', });
      fetchData();
      if(onInteraction) onInteraction();
    }
  };

  const handleRequestDocument = async () => {
    if (isReadOnly) return;
    if (!requestDivisi) return alert("Pilih divisi auditee terlebih dahulu!");
    const { iIdx, pIdx } = modalConfig;
    if (iIdx !== null && pIdx !== null) {
      const parameter = data[iIdx].parameters[pIdx];
      const payload = {
        id: `REQ-${Date.now()}`, assessmentId, assessmentYear, aspectId: aspect.id, indicatorId: data[iIdx].id, 
        parameterId: parameter.id, parameterName: parameter.parameterName, targetDivisi: requestDivisi, 
        requestedBy: user?.name || 'Auditor', requestDate: new Date().toLocaleDateString('id-ID'), note: requestNote
      };
      
      await fetchApi('/document-requests', {
        method: 'POST', headers: {  'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      setRequestDivisi(''); setRequestNote('');
      fetchData();
      if(onInteraction) onInteraction();
    }
  };

  const handleVerifyApprove = async (evidenceId: string, parameterId: string) => {
    if(isReadOnly) return;
    await fetchApi(`/evidences/${evidenceId}/status`, { method: 'PUT', headers: {  'Content-Type': 'application/json' }, body: JSON.stringify({status: 'Verified'}) });
    const reqToUpdate = dbRequests.find(r => r.assessmentId === assessmentId && r.parameterId === parameterId);
    if(reqToUpdate) {
      await fetchApi(`/document-requests/${reqToUpdate.id}`, { method: 'PUT', headers: {  'Content-Type': 'application/json' }, body: JSON.stringify({status: 'Verified', note: ''}) });
    }
    fetchData();
    if(onInteraction) onInteraction();
  };

  const handleVerifyReject = async (evidenceId: string, parameterId: string) => {
    if(isReadOnly) return;
    if (!rejectNoteInput.trim()) return alert("Alasan penolakan / revisi harus diisi!");
    await fetchApi(`/evidences/${evidenceId}/status`, { method: 'PUT', headers: {  'Content-Type': 'application/json' }, body: JSON.stringify({status: 'Rejected'}) });
    const reqToUpdate = dbRequests.find(r => r.assessmentId === assessmentId && r.parameterId === parameterId);
    if(reqToUpdate) {
      await fetchApi(`/document-requests/${reqToUpdate.id}`, { method: 'PUT', headers: {  'Content-Type': 'application/json' }, body: JSON.stringify({status: 'Rejected', note: rejectNoteInput}) });
    }
    setRejectingId(null); setRejectNoteInput('');
    fetchData();
    if(onInteraction) onInteraction();
  };

  const handleUseArchive = async (historyEv: EvidenceFile) => {
    if(isReadOnly) return;
    
    if(window.confirm(`Gunakan dokumen arsip "${historyEv.fileName}" (TB ${historyEv.assessmentYear}) untuk tahun ini?`)) {
      const newEvId = `EV-${Date.now()}`;
      
      try {
        const response = await fetchApi(`/evidences/${historyEv.id}/copy`, {
          method: 'POST',
          headers: { 
            
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            newAssessmentId: assessmentId,
            newAssessmentYear: assessmentYear,
            newId: newEvId
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(`Gagal menggunakan arsip: ${errorData.message || 'Terjadi kesalahan di server'}`);
          return;
        }

        fetchData();
        if(onInteraction) onInteraction();
        alert('Dokumen arsip berhasil disalin dan digunakan untuk tahun ini!');
        
      } catch (err) {
        alert("Gagal koneksi ke server saat menyalin arsip.");
      }
    }
  };

  const renderAspectIcon = () => {
    if (!aspect?.icon) return <Layers size={32} />;
    if (React.isValidElement(aspect.icon)) return React.cloneElement(aspect.icon as React.ReactElement, { size: 32 } as any);
    const IconCmp = aspect.icon as React.ElementType;
    return <IconCmp size={32} />;
  };

  const activeIndicator = modalConfig.iIdx !== null ? data[modalConfig.iIdx] : null;
  const activeParameter = modalConfig.pIdx !== null && activeIndicator ? activeIndicator.parameters[modalConfig.pIdx] : null;
  const activeEvidences = activeParameter ? dbEvidences.filter(e => e.assessmentId === assessmentId && e.parameterId === activeParameter.id) : [];
  const activeRequests = activeParameter ? dbRequests.filter(r => r.assessmentId === assessmentId && r.parameterId === activeParameter.id) : [];
  const historyEvidences = activeParameter ? dbEvidences.filter(e => e.parameterId === activeParameter.id && e.assessmentId !== assessmentId && e.status === 'Verified') : [];

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-300 w-full">
      <div className="flex justify-between bg-white p-4 border border-gray-200 rounded-xl gap-4 shadow-sm">
        <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 font-semibold px-3 transition-colors">
          <ChevronLeft size={20} /><span>Kembali ke Aspek</span>
        </button>
        {isReadOnly && (
          <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-lg text-xs font-bold border border-amber-200 flex items-center gap-2">
            <Lock size={14}/> Mode Read-Only (Hanya Lihat)
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center text-left gap-4">
        <div className="flex items-center space-x-4">
          <div className={`p-4 rounded-2xl shadow-inner flex items-center justify-center ${aspect?.color || 'bg-blue-100 text-blue-600'}`}>
            {renderAspectIcon()}
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 uppercase">{aspect?.name}</h1>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Kertas Kerja Penilaian GCG</p>
          </div>
        </div>
        <div className="flex items-center space-x-8 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-center px-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Skor Aspek</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{data.length > 0 ? Number(data[0].aspectScore || 0).toFixed(3) : "0.000"}</p>
            </div>
            <div className="w-px h-10 bg-gray-300"></div>
            <div className="text-center px-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Bobot Maksimal</p>
              <p className="text-2xl font-black text-gray-400 mt-1">{Number(masterAspectBobot || 0).toFixed(3)}</p>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full max-w-full">
        <div className="overflow-x-auto w-full text-left custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse min-w-[2400px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wider font-bold">
                <th className="px-4 py-4 border-r border-gray-200 text-center w-16">NO IND</th>
                <th className="px-4 py-4 border-r border-gray-200 w-64">INDIKATOR</th>
                <th className="px-4 py-4 border-r border-gray-200 text-center w-24">BOBOT IND</th>
                <th className="px-4 py-4 border-r border-gray-200 text-center w-16">NO PAR</th>
                <th className="px-4 py-4 border-r border-gray-200 w-64">PARAMETER</th>
                <th className="px-4 py-4 border-r border-gray-200 text-center w-24">BOBOT PAR</th>
                <th className="px-4 py-4 border-r border-gray-200 text-center w-12">NO</th>
                <th className="px-4 py-4 border-r border-gray-200 w-80">FAKTOR & SUB-FAKTOR YANG DIUJI</th>
                <th className="px-4 py-4 border-r border-gray-200 w-64">KETERANGAN</th>
                <th className="px-4 py-4 border-r border-gray-200 w-48">EVIDENCE</th>
                <th className="px-4 py-4 border-r border-gray-200 text-center w-24 text-blue-600">SKOR FAKTOR</th>
                <th className="px-4 py-4 border-r border-gray-200 text-center w-28 text-blue-600">SKOR PARAMETER</th>
                <th className="px-4 py-4 border-r border-gray-200 w-64">REKOMENDASI</th>
                <th className="px-4 py-4 border-r border-gray-200 w-48">TARGET TINDAK LANJUT</th>
                <th className="px-4 py-4 border-r border-gray-200 text-center w-28 text-green-600">SKOR INDIKATOR</th>
                <th className="px-4 py-4 border-r border-gray-200 text-center w-28 text-green-600">SKOR ASPEK</th>
                <th className="px-4 py-4 w-16 sticky right-0 bg-gray-50 border-l border-gray-200 text-center shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">{isReadOnly ? 'INFO' : 'AKSI'}</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {data.length === 0 && (
                <tr>
                  <td colSpan={17} className="px-4 py-12 text-center text-gray-500 font-bold">Kertas Kerja ini kosong karena dibuat sebelum Master Data terisi. Silakan kembali dan klik "Buat Penilaian Baru".</td>
                </tr>
              )}
              {data.map((indicator: IndicatorData, iIdx: number) => {
                const parameters = indicator.parameters || [];
                const totalRowsInIndicator = Math.max(1, parameters.reduce((acc, p) => acc + Math.max(1, (p.factors || []).length), 0));
                
                return parameters.map((param: ParameterData, pIdx: number) => {
                  const factors = param.factors || [];
                  const totalRowsInParam = Math.max(1, factors.length);
                  
                  return factors.map((factor: FactorData, fIdx: number) => {
                    const isFirstInIndicator = pIdx === 0 && fIdx === 0;
                    const isFirstInParameter = fIdx === 0;
                    const factorEvidences = dbEvidences?.filter(e => e.assessmentId === assessmentId && e.parameterId === param.id) || [];

                    let prevFactor: any = null;
                    let prevTaskStatus = 'Belum Ada Info';
                    
                    if (prevAssessment && prevAssessment.data[aspect.id]) {
                      const pInd = prevAssessment.data[aspect.id].find((i: any) => i.id === indicator.id);
                      if (pInd) {
                        const pParam = pInd.parameters.find((p: any) => p.id === param.id);
                        if (pParam) {
                          prevFactor = pParam.factors.find((f: any) => f.id === factor.id);
                          if (prevFactor && prevFactor.recommendation) {
                            const prevTaskId = `${prevAssessment.id}_${aspect.id}_${indicator.id}_${param.id}_${factor.id}`;
                            prevTaskStatus = tlRecords[prevTaskId]?.status || 'Open';
                          }
                        }
                      }
                    }

                    return (
                      <tr key={`fac-${iIdx}-${pIdx}-${fIdx}`} className="border-b border-gray-200 hover:bg-gray-50/50 align-top transition-colors">
                        {isFirstInIndicator && (
                          <React.Fragment>
                            <td rowSpan={totalRowsInIndicator} className="px-4 py-4 border-r border-gray-200 text-center text-gray-500 bg-white">{indicator.id}</td>
                            <td rowSpan={totalRowsInIndicator} className="px-4 py-4 border-r border-gray-200 font-bold text-gray-900 bg-white">{indicator.indicatorName}</td>
                            <td rowSpan={totalRowsInIndicator} className="px-4 py-4 border-r border-gray-200 text-center font-bold text-amber-600 bg-white">{indicator.bobot || 0}</td>
                          </React.Fragment>
                        )}
                        {isFirstInParameter && (
                          <React.Fragment>
                            <td rowSpan={totalRowsInParam} className="px-4 py-4 border-r border-gray-200 text-center text-gray-500 bg-white">{param.id}</td>
                            <td rowSpan={totalRowsInParam} className="px-4 py-4 border-r border-gray-200 font-semibold text-gray-800 bg-white">{param.parameterName}</td>
                            <td rowSpan={totalRowsInParam} className="px-4 py-4 border-r border-gray-200 text-center font-bold text-blue-600 bg-white">{param.bobot || 0}</td>
                          </React.Fragment>
                        )}
                        
                        <td className="px-4 py-4 border-r border-gray-200 text-center text-gray-500 bg-white">{fIdx + 1}</td>
                        <td className="px-4 py-4 border-r border-gray-200 bg-white">
                          <p className="font-semibold text-gray-900">{factor.name}</p>
                          {factor.subFactors && factor.subFactors.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {factor.subFactors.map(sf => (
                                <div key={sf.id} className="text-xs bg-gray-50 p-2.5 rounded border border-gray-200 flex items-start gap-2 relative overflow-hidden">
                                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${sf.isFulfilled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                  <span className="font-bold text-gray-500 pl-2">{sf.id}.</span>
                                  <div>
                                    <span className={`font-semibold block ${sf.isFulfilled ? 'text-green-700' : 'text-gray-700'}`}>{sf.name}</span>
                                    {sf.description && <span className="text-gray-500 italic block mt-0.5">{sf.description}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {prevFactor && prevFactor.recommendation && (
                            <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
                              <div className="flex items-center justify-between mb-2 border-b border-amber-200/50 pb-2">
                                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5"><HistoryIcon size={14}/> Rekomendasi TB {prevAssessment.year}</p>
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${prevTaskStatus === 'Closed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : prevTaskStatus === 'Submitted' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>Status TL: {prevTaskStatus}</span>
                              </div>
                              <p className="text-xs text-amber-900 font-semibold italic line-clamp-3" title={prevFactor.recommendation}>"{prevFactor.recommendation}"</p>
                            </div>
                          )}
                        </td>
                        
                        <td className="px-4 py-4 border-r border-gray-200 text-gray-600 bg-white">
                          <p>{factor.description || <span className="text-gray-400 text-xs italic">Temuan belum diisi...</span>}</p>
                        </td>

                        <td className="px-4 py-4 border-r border-gray-200 bg-white">
                           {factorEvidences.length > 0 ? (
                             <div className="space-y-2">
                               {factorEvidences.map(file => (
                                 <div key={file.id} className="p-2.5 bg-blue-50/50 border border-blue-100 rounded flex flex-col text-blue-700 shadow-sm transition-colors group relative pr-8">
                                   <div className="flex items-center space-x-2 cursor-pointer hover:underline" onClick={() => setViewingDocument(file)}>
                                     <FileText size={14} className="shrink-0" />
                                     <span className="text-xs font-bold truncate w-24" title={file.fileName}>{file.fileName}</span>
                                   </div>
                                   <div className="mt-2 pt-2 border-t border-blue-100">
                                     {file.status === 'Verified' && <span className="text-[9px] font-black text-green-600 uppercase bg-green-100 px-2 py-0.5 rounded">✓ Verified</span>}
                                     {file.status === 'Menunggu Verifikasi' && <span className="text-[9px] font-black text-amber-600 uppercase bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1 w-fit"><Clock size={10}/> Cek Dokumen</span>}
                                     {file.status === 'Rejected' && <span className="text-[9px] font-black text-red-600 uppercase bg-red-100 px-2 py-0.5 rounded">× Ditolak</span>}
                                   </div>
                                   {!isReadOnly && (
                                     <button onClick={(e) => handleDeleteEvidence(file.id, e)} className="absolute right-2 top-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded" title="Hapus Dokumen">
                                       <Trash2 size={14}/>
                                     </button>
                                   )}
                                 </div>
                               ))}
                             </div>
                           ) : (
                             <span className="text-gray-400 italic text-xs">Belum ada evidence</span>
                           )}
                        </td>

                        <td className="px-4 py-4 border-r border-gray-200 text-center bg-white">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${(Number(factor.factorScore) || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                            {Number(factor.factorScore || 0).toFixed(2)}
                          </span>
                        </td>
                        
                        {isFirstInParameter && (
                          <td rowSpan={totalRowsInParam} className="px-4 py-4 border-r border-gray-200 text-center font-bold text-blue-700 bg-white">
                            {Number(param.parameterScore || 0).toFixed(3)}
                          </td>
                        )}
                        
                        <td className="px-4 py-4 border-r border-gray-200 text-gray-700 bg-white">
                          {factor.recommendation ? <p>{factor.recommendation}</p> : <span className="italic text-gray-400 text-xs">Belum ada rekomendasi...</span>}
                        </td>
                        
                        <td className="px-4 py-4 border-r border-gray-200 text-gray-600 bg-white">
                          {(factor.picDivisi || factor.dueDate) ? (
                            <div className="text-xs space-y-1">
                              {factor.picDivisi && <div><span className="font-semibold text-gray-500">PIC:</span> <span className="font-bold text-gray-900">{factor.picDivisi}</span></div>}
                              {factor.dueDate && <div><span className="font-semibold text-gray-500">Deadline:</span> <span className="font-bold text-red-600">{factor.dueDate}</span></div>}
                            </div>
                          ) : (
                            <span className="italic text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        
                        {isFirstInIndicator && (
                          <React.Fragment>
                            <td rowSpan={totalRowsInIndicator} className="px-4 py-4 border-r border-gray-200 text-center font-bold text-amber-600 bg-white">{Number(indicator.indicatorScore || 0).toFixed(3)}</td>
                            <td rowSpan={totalRowsInIndicator} className="px-4 py-4 border-r border-gray-200 text-center font-bold text-green-600 bg-white">{Number(indicator.aspectScore || 0).toFixed(3)}</td>
                          </React.Fragment>
                        )}

                        <td className="px-4 py-4 text-center sticky right-0 bg-white border-l border-gray-200 shadow-[-4px_0_10px_rgba(0,0,0,0.05)] group-hover:bg-gray-50/50">
                          <div className="flex justify-center">
                            <button onClick={() => openModal('factor', iIdx, pIdx, fIdx)} className={`p-2 rounded-lg transition-colors border ${isReadOnly ? 'text-amber-600 hover:bg-amber-50 border-amber-200' : 'text-blue-600 hover:text-white hover:bg-blue-600 border-blue-200'}`}>
                              {isReadOnly ? <Eye size={16} /> : <Edit2 size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                });
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalConfig.show && modalConfig.type === 'factor' && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm text-left">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className={`px-6 py-4 flex justify-between items-center text-white ${isReadOnly ? 'bg-amber-600' : 'bg-blue-600'}`}>
                 <div className="flex items-center space-x-3">
                   {isReadOnly ? <Eye size={18} className="text-white"/> : <Target size={18} className="text-white"/>}
                   <h2 className="text-sm font-bold flex items-center space-x-2 uppercase tracking-wider">
                     {isReadOnly ? 'Lihat Detail Kertas Kerja' : 'Verifikasi & Penilaian'}
                   </h2>
                 </div>
                 <button type="button" onClick={closeModal} className="p-2 hover:bg-black/20 rounded-full transition-colors"><X size={20}/></button>
               </div>
               
               <form onSubmit={handleSave} className="p-6 md:p-8 overflow-y-auto flex-1 bg-gray-50 custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                     
                     <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Keterangan / Temuan Auditor</label>
                       <textarea 
                         disabled={isReadOnly} 
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm transition-all h-24 disabled:bg-gray-100 disabled:text-gray-500" 
                         value={modalConfig.data.description || ''} 
                         onChange={(e) => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, description: e.target.value } })}
                       ></textarea>
                     </div>

                     <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                       <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                         <Target size={16} className="text-blue-600"/> Penilaian Pemenuhan Kriteria
                       </h3>
                       {modalConfig.data.subFactors && modalConfig.data.subFactors.length > 0 ? (
                         <div className="space-y-3 bg-gray-50/50 p-5 rounded-xl border border-gray-200">
                           <div className="flex justify-between items-center mb-3 border-b border-gray-200 pb-3">
                             <span className="text-xs font-bold text-gray-500 uppercase">Checklist Kriteria</span>
                             <span className="text-xs font-black text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200">
                               Skor: {Number(modalConfig.data.factorScore || 0).toFixed(2)}
                             </span>
                           </div>
                           {modalConfig.data.subFactors.map((sf: any, sfIndex: number) => (
                             <label key={sf.id} className={`flex items-start gap-4 p-3 bg-white rounded-xl border border-gray-200 transition-all shadow-sm ${isReadOnly ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-blue-50/30 hover:border-blue-300'}`}>
                               <input 
                                 disabled={isReadOnly} 
                                 type="checkbox" 
                                 className="mt-1 w-5 h-5 text-blue-600 rounded cursor-pointer border-gray-300 focus:ring-blue-500 disabled:cursor-not-allowed" 
                                 checked={sf.isFulfilled || false} 
                                 onChange={(e) => {
                                   const updatedSubFactors = [...modalConfig.data.subFactors];
                                   updatedSubFactors[sfIndex].isFulfilled = e.target.checked;
                                   const fulfilledCount = updatedSubFactors.filter(s => s.isFulfilled).length;
                                   const newScore = calculateFactorScoreSK16((fulfilledCount / updatedSubFactors.length) * 100);
                                   setModalConfig({ ...modalConfig, data: { ...modalConfig.data, subFactors: updatedSubFactors, factorScore: newScore } });
                                 }} 
                               />
                               <div>
                                 <span className={`font-bold text-sm block ${sf.isFulfilled ? 'text-blue-700' : 'text-gray-700'}`}>{sf.name}</span>
                                 {sf.description && <p className="text-xs text-gray-500 mt-1 italic">{sf.description}</p>}
                               </div>
                             </label>
                           ))}
                         </div>
                       ) : (
                         <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Pilih Skor</label>
                           <select 
                             disabled={isReadOnly} 
                             className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" 
                             value={modalConfig.data.factorScore || 0} 
                             onChange={(e) => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, factorScore: Number(e.target.value) } })}
                           >
                             <option value={0.00}>0.00 (0%)</option>
                             <option value={0.25}>0.25 (&gt;0% s/d &lt;50%)</option>
                             <option value={0.50}>0.50 (50% s/d &lt;75%)</option>
                             <option value={0.75}>0.75 (75% s/d &lt;85%)</option>
                             <option value={1.00}>1.00 (&ge;85%)</option>
                           </select>
                         </div>
                       )}
                     </div>

                     <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                       <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                         <Target size={16} className="text-blue-600"/> Tindak Lanjut
                       </h3>
                       <div className="space-y-4">
                         <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Rekomendasi Auditor</label>
                           <textarea 
                             disabled={isReadOnly} 
                             className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all disabled:bg-gray-100 disabled:text-gray-500" 
                             value={modalConfig.data.recommendation || ''} 
                             onChange={(e) => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, recommendation: e.target.value } })}
                           ></textarea>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Divisi PIC</label>
                             <select 
                               disabled={isReadOnly} 
                               className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-700 cursor-pointer shadow-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" 
                               value={modalConfig.data.picDivisi || ''} 
                               onChange={(e) => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, picDivisi: e.target.value } })}
                             >
                               <option value="">-- Pilih Divisi --</option>
                               {divisions.map(div => <option key={div} value={div}>{div}</option>)}
                             </select>
                           </div>
                           <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Deadline</label>
                             <input 
                               disabled={isReadOnly} 
                               type="date" 
                               className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-700 cursor-pointer shadow-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" 
                               value={modalConfig.data.dueDate || ''} 
                               onChange={(e) => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, dueDate: e.target.value } })}
                             />
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>

                   <div className="space-y-6">
                     <div className="bg-blue-50/60 p-5 rounded-xl border border-blue-200 shadow-sm h-full flex flex-col">
                       <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-4 border-b border-blue-200/50 pb-2 flex items-center gap-2">
                         <FileText size={16} className="text-blue-600"/> Manajemen Dokumen (Evidence)
                       </h3>
                       
                       <div className="flex-1 space-y-3 mb-6">
                          {activeEvidences.map(ev => (
                            <div key={ev.id} className="flex flex-col p-3 bg-white border border-blue-200 rounded-lg shadow-sm relative pr-8">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-bold text-blue-600 cursor-pointer hover:underline group" onClick={() => setViewingDocument(ev)}>
                                  <FileText size={14} className="text-blue-500"/>
                                  <span className="truncate w-36">{ev.fileName}</span>
                                  <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${ev.status === 'Verified' ? 'bg-green-100 text-green-700' : ev.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {ev.status}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400 font-medium mt-1">Oleh: {ev.divisi}</span>

                              {!isReadOnly && (
                                <button type="button" onClick={(e) => handleDeleteEvidence(ev.id, e)} className="absolute right-2 top-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded">
                                  <Trash2 size={16}/>
                                </button>
                              )}

                              {ev.status === 'Menunggu Verifikasi' && !isReadOnly && (
                                <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
                                   {rejectingId === ev.id ? (
                                     <div className="flex flex-col gap-2 w-full animate-in fade-in zoom-in-95">
                                       <input 
                                         type="text" 
                                         placeholder="Catatan revisi / alasan tolak..." 
                                         className="w-full text-xs font-medium border border-red-300 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-red-500" 
                                         value={rejectNoteInput} 
                                         onChange={e => setRejectNoteInput(e.target.value)} 
                                       />
                                       <div className="flex gap-2">
                                         <button type="button" onClick={() => handleVerifyReject(ev.id, ev.parameterId)} className="flex-1 bg-red-600 text-white text-[10px] py-1.5 rounded font-bold hover:bg-red-700">Kirim Revisi</button>
                                         <button type="button" onClick={() => setRejectingId(null)} className="flex-1 bg-gray-200 text-gray-700 text-[10px] py-1.5 rounded font-bold hover:bg-gray-300">Batal</button>
                                       </div>
                                     </div>
                                   ) : (
                                     <React.Fragment>
                                       <button type="button" onClick={() => handleVerifyApprove(ev.id, ev.parameterId)} className="flex-1 bg-green-50 hover:bg-green-600 hover:text-white border border-green-200 hover:border-green-600 text-green-700 text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                                         <CheckCircle size={14}/> Setujui
                                       </button>
                                       <button type="button" onClick={() => setRejectingId(ev.id)} className="flex-1 bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 text-red-700 text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                                         <AlertCircle size={14}/> Tolak (Revisi)
                                       </button>
                                     </React.Fragment>
                                   )}
                                </div>
                              )}
                            </div>
                          ))}

                          {activeRequests.filter(req => req.status === 'Requested').map(req => (
                            <div key={req.id} className="flex items-center justify-between p-3 bg-white border border-amber-200 rounded-lg shadow-sm">
                              <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <BellRing size={16} className="text-amber-500"/> <span>Tagihan: {req.targetDivisi}</span>
                              </div>
                              <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-700 px-2 py-1 rounded">Belum Diunggah</span>
                            </div>
                          ))}

                          {activeEvidences.length === 0 && activeRequests.filter(req => req.status === 'Requested').length === 0 && (
                            <div className="text-center p-6 border-2 border-dashed border-blue-200 rounded-xl text-blue-400 text-xs font-medium bg-white/50">
                              <FileText size={24} className="mx-auto mb-2 opacity-50"/>
                              Belum ada dokumen atau tagihan.
                            </div>
                          )}

                          {historyEvidences.length > 0 && !isReadOnly && (
                            <div className="mt-6 border-t border-blue-200/50 pt-4">
                              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                                <HistoryIcon size={12}/> Arsip Tahun Sebelumnya
                              </h4>
                              {historyEvidences.map(h => (
                                <div key={h.id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm mb-2 hover:border-blue-300 transition-colors group">
                                   <div className="flex items-center gap-2 text-xs font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => setViewingDocument(h)}>
                                     <FileText size={14} className="text-gray-400"/> 
                                     <span className="truncate w-32">{h.fileName}</span> 
                                     <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded no-underline">TB {h.assessmentYear || h.assessmentId}</span>
                                   </div>
                                   <button type="button" onClick={() => handleUseArchive(h)} className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors opacity-0 group-hover:opacity-100">
                                     <Copy size={12}/> Gunakan
                                   </button>
                                </div>
                              ))}
                            </div>
                          )}
                       </div>

                       {!isReadOnly && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-blue-200/50 pt-5 mt-auto">
                           <label className="flex items-center justify-center gap-2 bg-white border border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-blue-600 rounded-lg py-2.5 cursor-pointer transition-all shadow-sm">
                             <UploadCloud size={16} />
                             <span className="text-xs font-bold uppercase">Auditor Upload</span>
                             <input type="file" accept=".pdf, .xls, .xlsx" className="hidden" onChange={handleUploadOlehAuditor} />
                           </label>
                           <div className="flex gap-2">
                              <select 
                                className="flex-1 text-xs font-bold px-3 border border-blue-300 rounded-lg outline-none bg-white text-gray-700" 
                                value={requestDivisi} 
                                onChange={e => setRequestDivisi(e.target.value)}
                              >
                                <option value="">-- Tagih ke Divisi --</option>
                                {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                              <button type="button" onClick={handleRequestDocument} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase px-4 rounded-lg transition-colors">
                                Kirim
                              </button>
                           </div>
                         </div>
                       )}
                     </div>
                   </div>

                 </div>
               </form>

               <div className={`p-5 border-t border-gray-200 flex justify-end space-x-3 shrink-0 ${isReadOnly ? 'bg-amber-50' : 'bg-white'}`}>
                 <button type="button" onClick={closeModal} className={`px-6 py-2.5 rounded-lg font-bold transition-colors ${isReadOnly ? 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-100' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                   {isReadOnly ? 'Tutup' : 'Batal'}
                 </button>
                 {!isReadOnly && (
                   <button type="button" onClick={handleSave} className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-transform active:scale-95 shadow-md shadow-blue-500/20">
                     <Save size={18}/> <span>Simpan Kertas Kerja</span>
                   </button>
                 )}
               </div>
            </div>
         </div>
      )}

      {/* MODAL DOCUMENT VIEWER */}
      {viewingDocument && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0 shadow-md z-10">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg"><FileText size={20} className="text-blue-400"/></div>
                <div>
                  <h2 className="text-sm font-bold truncate max-w-lg leading-tight">{viewingDocument.fileName}</h2>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-widest">Diunggah oleh: {viewingDocument.divisi}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {viewingDocument.fileUrl && (
                  <a href={viewingDocument.fileUrl.replace(/^http:\/\//i, 'https://')} target="_blank" download className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2">
                    <Download size={14}/> Unduh File
                  </a>
                )}
                <button onClick={() => setViewingDocument(null)} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={24}/>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center">
               {viewingDocument.fileUrl && viewingDocument.fileUrl.endsWith('.pdf') ? (
                 <iframe src={viewingDocument.fileUrl.replace(/^http:\/\//i, 'https://')} title={viewingDocument.fileName} className="w-full h-full border-none bg-white"></iframe>
               ) : (
                 <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
                   <AlertCircle size={64} className="text-slate-300 mb-4" />
                   <h3 className="text-xl font-black text-slate-800 mb-2">{viewingDocument.fileName}</h3>
                   <p className="text-slate-500 text-sm mb-6">Pratinjau langsung hanya tersedia untuk file PDF. Silakan unduh file untuk melihat isinya.</p>
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