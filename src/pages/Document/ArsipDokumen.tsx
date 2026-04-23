import React, { useState, useEffect, useMemo } from 'react';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Archive, ChevronDown, ChevronRight, Download, FileText, 
  CheckCircle, Clock, XCircle, AlertTriangle, Eye, Layers, Search
} from 'lucide-react';
import type { EvidenceFile, DocumentRequest } from '../../types';

interface AssessmentMeta {
  id: string;
  year: string;
  tb: string;
  status: string;
}

export default function ArsipDokumen() {
  const { user } = useAuth();
  
  const [assessmentsList, setAssessmentsList] = useState<AssessmentMeta[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  
  const [evidences, setEvidences] = useState<EvidenceFile[]>([]);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [aspectsMap, setAspectsMap] = useState<Record<string, string>>({});
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAspects, setExpandedAspects] = useState<Record<string, boolean>>({});
  
  const [viewingDoc, setViewingDoc] = useState<{url: string, name: string} | null>(null);

  const fetchData = async () => {
    const headers = { 'Accept': 'application/json' };

    try {
      // Fetch Master Aspects
      const resMaster = await fetchApi('/master-indicators', { headers });
      let tempAspectsMap: Record<string, string> = {};
      if (resMaster.ok) {
        const md = await resMaster.json();
        md.forEach((a: any) => tempAspectsMap[a.id] = `${a.name}`);
        setAspectsMap(tempAspectsMap);
      }

      // Fetch Assessments
      const resAss = await fetchApi('/assessments', { headers });
      if (resAss.ok) {
        const assessments = await resAss.json();
        let extractedAssessments: AssessmentMeta[] = [];
        
        assessments.forEach((ass: any) => {
          if (ass.status !== 'Draft') {
            extractedAssessments.push({ id: ass.id, year: ass.year, tb: ass.tb, status: ass.status });
          }
        });
        
        // Sort descending by year
        extractedAssessments.sort((a, b) => Number(b.year) - Number(a.year));
        setAssessmentsList(extractedAssessments);
        
        if (extractedAssessments.length > 0 && !selectedAssessmentId) {
          setSelectedAssessmentId(extractedAssessments[0].id);
        }
      }

      // Fetch all Evidences
      const resEv = await fetchApi('/evidences', { headers });
      if (resEv.ok) {
        setEvidences(await resEv.json());
      }

      // Fetch all Document Requests
      const resReq = await fetchApi('/document-requests', { headers });
      if (resReq.ok) {
        setDocumentRequests(await resReq.json());
      }

    } catch (e) {
      console.error("Error fetching arsip data", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Filter data by selected assessment and search query
  const filteredEvidences = useMemo(() => {
    let filtered = evidences.filter(e => e.assessmentId === selectedAssessmentId);
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.fileName.toLowerCase().includes(lowerQuery) || 
        e.divisi.toLowerCase().includes(lowerQuery) ||
        (aspectsMap[e.aspectId] || '').toLowerCase().includes(lowerQuery)
      );
    }
    return filtered;
  }, [evidences, selectedAssessmentId, searchQuery, aspectsMap]);

  const filteredRequests = useMemo(() => {
    let filtered = documentRequests.filter(r => r.assessmentId === selectedAssessmentId && r.status === 'Requested');
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.targetDivisi.toLowerCase().includes(lowerQuery) ||
        (aspectsMap[r.aspectId] || '').toLowerCase().includes(lowerQuery) ||
        (r.parameterName || '').toLowerCase().includes(lowerQuery)
      );
    }
    return filtered;
  }, [documentRequests, selectedAssessmentId, searchQuery, aspectsMap]);

  // Group by aspectId
  const groupedData = useMemo(() => {
    const groups: Record<string, {
      aspectName: string,
      evidences: EvidenceFile[],
      requests: DocumentRequest[]
    }> = {};

    // Get all unique aspect IDs from the master map first to keep order
    Object.keys(aspectsMap).forEach(aspectId => {
      groups[aspectId] = {
        aspectName: aspectsMap[aspectId],
        evidences: [],
        requests: []
      };
    });

    filteredEvidences.forEach(ev => {
      if (!groups[ev.aspectId]) {
        groups[ev.aspectId] = { aspectName: aspectsMap[ev.aspectId] || `Aspek ${ev.aspectId}`, evidences: [], requests: [] };
      }
      groups[ev.aspectId].evidences.push(ev);
    });

    filteredRequests.forEach(req => {
      if (!groups[req.aspectId]) {
        groups[req.aspectId] = { aspectName: aspectsMap[req.aspectId] || `Aspek ${req.aspectId}`, evidences: [], requests: [] };
      }
      groups[req.aspectId].requests.push(req);
    });

    // Remove empty groups if there's no data and not searching
    return Object.entries(groups)
      .filter(([_, data]) => data.evidences.length > 0 || data.requests.length > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredEvidences, filteredRequests, aspectsMap]);

  const toggleAspect = (aspectId: string) => {
    setExpandedAspects(prev => ({ ...prev, [aspectId]: !prev[aspectId] }));
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Verified': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Menunggu Verifikasi': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const totalDocuments = filteredEvidences.length;
  const totalRequests = filteredRequests.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left pb-10 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
        <div className="flex items-center space-x-5 relative z-10">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 text-white shrink-0">
            <Archive className="w-8 h-8" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">Arsip Dokumen</h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">Pusat Repositori Bukti Assessment GCG</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative z-10">
        
        {/* DROPDOWN ASSESSMENT */}
        <div className="relative w-full md:w-1/3">
          <select 
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-5 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner cursor-pointer transition-all hover:bg-white"
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
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
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-md flex items-center justify-center border border-slate-200 pointer-events-none shadow-sm">
            <ChevronDown className="w-4 h-4 text-slate-500" strokeWidth={3}/>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full md:w-1/2">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block pl-11 p-3.5 outline-none transition-all shadow-inner placeholder-slate-400"
            placeholder="Cari nama dokumen atau divisi pengunggah..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 block relative z-10">Total Dokumen Terunggah</span>
            <span className="text-4xl font-black text-slate-800 tracking-tighter relative z-10">{totalDocuments}</span>
          </div>
          <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-500 relative z-10"><FileText strokeWidth={2} size={32}/></div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-amber-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full blur-2xl -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div>
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 block relative z-10">Total Permintaan / Tagihan Aktif</span>
            <span className="text-4xl font-black text-slate-800 tracking-tighter relative z-10">{totalRequests}</span>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl text-amber-500 relative z-10"><Clock strokeWidth={2} size={32}/></div>
        </div>
      </div>

      {/* DOCUMENT LIST */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
        {groupedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6">
              <Archive size={40} strokeWidth={1.5}/>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Tidak Ada Dokumen</h3>
            <p className="text-slate-500 font-medium text-sm max-w-md">
              {searchQuery ? 'Tidak ada dokumen yang cocok dengan kata kunci pencarian Anda.' : 'Belum ada dokumen yang diunggah atau diminta pada periode Assessment ini.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {groupedData.map(([aspectId, data]) => {
              // Expand by default if searching, otherwise use state or collapse
              const isExpanded = searchQuery ? true : !!expandedAspects[aspectId];
              
              return (
                <div key={aspectId} className="group/aspect">
                  <button 
                    onClick={() => toggleAspect(aspectId)} 
                    className="w-full flex items-center justify-between p-6 hover:bg-indigo-50/30 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-xl transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover/aspect:bg-indigo-50 group-hover/aspect:text-indigo-500'}`}>
                        {isExpanded ? <ChevronDown size={20} strokeWidth={2.5}/> : <ChevronRight size={20} strokeWidth={2.5}/>}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight group-hover/aspect:text-indigo-700 transition-colors">
                          {data.aspectName}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                          Aspek {aspectId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {data.evidences.length > 0 && (
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                          <FileText size={12}/> {data.evidences.length} Berkas
                        </span>
                      )}
                      {data.requests.length > 0 && (
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                          <Clock size={12}/> {data.requests.length} Tagihan
                        </span>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 bg-slate-50/50">
                      
                      {/* Grid untuk Dokumen */}
                      {data.evidences.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Layers size={14}/> Daftar Dokumen Terunggah
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {data.evidences.map(ev => (
                              <div key={ev.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col justify-between">
                                <div>
                                  <div className="flex items-start justify-between mb-3 gap-2">
                                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                                      <FileText size={18} strokeWidth={2}/>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border flex items-center gap-1 text-right shrink-0 ${getStatusColor(ev.status)}`}>
                                      {ev.status === 'Verified' && <CheckCircle size={10}/>}
                                      {ev.status === 'Menunggu Verifikasi' && <Clock size={10}/>}
                                      {ev.status === 'Rejected' && <XCircle size={10}/>}
                                      {ev.status}
                                    </span>
                                  </div>
                                  
                                  <h5 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors" title={ev.fileName}>
                                    {ev.fileName}
                                  </h5>
                                  
                                  <div className="flex flex-wrap gap-2 mt-auto">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                      Oleh: {ev.divisi}
                                    </span>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                      {ev.uploadDate}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                                  <button onClick={() => setViewingDoc({url: ev.fileUrl, name: ev.fileName})} className="flex-1 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 font-black py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 border border-slate-200 hover:border-indigo-200">
                                    <Eye size={14} strokeWidth={2.5}/> Pratinjau
                                  </button>
                                  <a href={ev.fileUrl.replace(/^http:\/\//i, 'https://')} target="_blank" download className="flex-none p-2 bg-slate-50 hover:bg-indigo-600 text-slate-500 hover:text-white rounded-xl transition-all border border-slate-200 hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30">
                                    <Download size={16} strokeWidth={2.5}/>
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* List untuk Tagihan Aktif */}
                      {data.requests.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Clock size={14}/> Menunggu Unggahan Dokumen
                          </h4>
                          <div className="space-y-3">
                            {data.requests.map(req => (
                              <div key={req.id} className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0">
                                    <AlertTriangle size={18} strokeWidth={2}/>
                                  </div>
                                  <div>
                                    <h5 className="text-xs font-bold text-slate-800">Permintaan Dokumen Ke: <span className="text-amber-700">{req.targetDivisi}</span></h5>
                                    {req.parameterName && <p className="text-[10px] font-bold text-slate-500 mt-0.5 line-clamp-1">{req.parameterName}</p>}
                                    {req.note && <p className="text-[10px] text-slate-500 mt-1 italic leading-tight max-w-xl">"{req.note}"</p>}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-amber-100 text-amber-700 border border-amber-200">
                                    Belum Diunggah
                                  </span>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                                    Diminta oleh: {req.requestedBy}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Pratinjau Dokumen Arsip</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <a href={viewingDoc.url.replace(/^http:\/\//i, 'https://')} target="_blank" download className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 border border-indigo-400/50">
                  <Download size={14} strokeWidth={3}/> Unduh Asli
                </a>
                <button onClick={() => setViewingDoc(null)} className="p-2.5 bg-white/5 hover:bg-rose-500 hover:text-white rounded-xl transition-all active:scale-90 text-slate-400">
                  <XCircle size={20} strokeWidth={2.5}/>
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center p-2">
               {viewingDoc.url && viewingDoc.url.endsWith('.pdf') ? (
                 <iframe src={viewingDoc.url.replace(/^http:\/\//i, 'https://')} title={viewingDoc.name} className="w-full h-full border-none rounded-2xl bg-white shadow-inner"/>
               ) : (
                 <div className="flex flex-col items-center justify-center p-12 text-center max-w-md bg-white rounded-3xl shadow-sm border border-slate-200">
                   <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6"><AlertTriangle size={48} className="text-slate-300" strokeWidth={1.5} /></div>
                   <h3 className="text-xl font-black text-slate-800 mb-2 truncate w-full px-4">{viewingDoc.name}</h3>
                   <p className="text-slate-500 text-sm font-medium mb-8">Pratinjau langsung hanya didukung untuk format dokumen PDF. Silakan unduh untuk melihat konten selengkapnya.</p>
                   {viewingDoc.url && (
                    <a href={viewingDoc.url.replace(/^http:\/\//i, 'https://')} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/30 active:scale-95 flex items-center gap-2">
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
