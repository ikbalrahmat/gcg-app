import { useState, useEffect, useMemo } from 'react';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Archive, ChevronDown, Download, FileText, 
  CheckCircle, Clock, XCircle, AlertTriangle, Eye, Search, Target, Filter, Layers 
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
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAspect, setSelectedAspect] = useState<string>('all');
  
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

  // 1. Filter by Assessment & Search Query
  const filteredEvidences = useMemo(() => {
    let filtered = evidences.filter(e => e.assessmentId === selectedAssessmentId);
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.fileName.toLowerCase().includes(lowerQuery) || 
        e.divisi.toLowerCase().includes(lowerQuery)
      );
    }
    return filtered;
  }, [evidences, selectedAssessmentId, searchQuery]);

  const filteredRequests = useMemo(() => {
    let filtered = documentRequests.filter(r => r.assessmentId === selectedAssessmentId && r.status === 'Requested');
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.targetDivisi.toLowerCase().includes(lowerQuery) ||
        (r.parameterName || '').toLowerCase().includes(lowerQuery)
      );
    }
    return filtered;
  }, [documentRequests, selectedAssessmentId, searchQuery]);

  // 2. Group by Aspect & Apply Aspect Filter
  const groupedData = useMemo(() => {
    const groups: Record<string, {
      aspectName: string,
      evidences: EvidenceFile[],
      requests: DocumentRequest[]
    }> = {};

    Object.keys(aspectsMap).forEach(aspectId => {
      // Apply Aspect Filter here
      if (selectedAspect === 'all' || selectedAspect === aspectId) {
        groups[aspectId] = {
          aspectName: aspectsMap[aspectId],
          evidences: [],
          requests: []
        };
      }
    });

    filteredEvidences.forEach(ev => {
      if (groups[ev.aspectId]) {
        groups[ev.aspectId].evidences.push(ev);
      }
    });

    filteredRequests.forEach(req => {
      if (groups[req.aspectId]) {
        groups[req.aspectId].requests.push(req);
      }
    });

    // Remove empty groups
    return Object.entries(groups)
      .filter(([_, data]) => data.evidences.length > 0 || data.requests.length > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredEvidences, filteredRequests, aspectsMap, selectedAspect]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Verified': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Menunggu Verifikasi': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const totalDocuments = filteredEvidences.length;
  const totalRequests = filteredRequests.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left pb-10 max-w-7xl mx-auto min-w-0">
      
      {/* HEADER TITLE */}
      <div className="flex items-center space-x-4 mb-2">
        <div className="p-3 bg-indigo-600 rounded-xl shadow-md shadow-indigo-200">
          <Archive className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Arsip Dokumen</h1>
          <p className="text-sm font-medium text-slate-500">Pusat Repositori Bukti Assessment GCG</p>
        </div>
      </div>

      {/* SUMMARY STATS (Compact) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Total Dokumen Terunggah</span>
            <span className="text-3xl font-black text-slate-800 leading-none">{totalDocuments}</span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0"><FileText strokeWidth={2} size={24}/></div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Total Permintaan Aktif</span>
            <span className="text-3xl font-black text-slate-800 leading-none">{totalRequests}</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0"><Clock strokeWidth={2} size={24}/></div>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 justify-between items-center relative z-10">
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-2/3">
          {/* 1. Filter Assessment */}
          <div className="relative w-full sm:w-1/2">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Target className="w-4 h-4 text-indigo-500" />
            </div>
            <select 
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-white transition-all cursor-pointer shadow-sm"
              value={selectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
            >
              {assessmentsList.length === 0 ? (
                <option value="">Belum ada Assessment</option>
              ) : (
                assessmentsList.map(ass => (
                  <option key={ass.id} value={ass.id}>
                    TB {ass.year} - {ass.tb} ({ass.status})
                  </option>
                ))
              )}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* 2. Filter Aspek (BARU) */}
          <div className="relative w-full sm:w-1/2">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Filter className="w-4 h-4 text-indigo-500" />
            </div>
            <select 
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-white transition-all cursor-pointer shadow-sm"
              value={selectedAspect}
              onChange={(e) => setSelectedAspect(e.target.value)}
            >
              <option value="all">Tampilkan Semua Aspek</option>
              {Object.entries(aspectsMap).map(([id, name]) => (
                <option key={id} value={id}>Aspek {id}: {name}</option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* 3. Search Bar */}
        <div className="relative w-full lg:w-1/3">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-indigo-500 block pl-10 p-2.5 outline-none transition-all shadow-sm placeholder-slate-400 hover:bg-white"
            placeholder="Cari dokumen / divisi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* DATA TABLES */}
      <div className="space-y-6">
        {groupedData.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center p-16 text-center">
            <div className="w-20 h-20 bg-slate-50 border border-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-4">
              <Archive size={32} strokeWidth={1.5}/>
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-1.5">Tidak Ada Data Dokumen</h3>
            <p className="text-slate-500 font-medium text-sm max-w-md">
              Silakan sesuaikan Filter Aspek atau Kata Kunci Pencarian Anda.
            </p>
          </div>
        ) : (
          groupedData.map(([aspectId, data]) => (
            <div key={aspectId} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              
              {/* Header Tabel Aspek */}
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Layers size={18} strokeWidth={2.5}/>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 tracking-tight text-lg uppercase">{data.aspectName}</h3>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aspek {aspectId}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-6">
                
                {/* TABEL 1: DOKUMEN TERUNGGAH */}
                {data.evidences.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={16}/> Dokumen Terunggah
                      </h4>
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                        Jumlah: {data.evidences.length} Berkas
                      </span>
                    </div>
                    
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                          <tr>
                            <th className="px-4 py-3 text-center w-12 border-r border-slate-200">No</th>
                            <th className="px-4 py-3 border-r border-slate-200">Nama Dokumen</th>
                            <th className="px-4 py-3 border-r border-slate-200">Divisi Pengunggah</th>
                            <th className="px-4 py-3 border-r border-slate-200">Waktu Unggah</th>
                            <th className="px-4 py-3 border-r border-slate-200 text-center">Status</th>
                            <th className="px-4 py-3 text-center w-32">Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.evidences.map((ev, idx) => (
                            <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-center font-bold text-slate-400 border-r border-slate-100">{idx + 1}</td>
                              <td className="px-4 py-3 font-bold text-slate-800 border-r border-slate-100 max-w-xs truncate" title={ev.fileName}>
                                {ev.fileName}
                              </td>
                              <td className="px-4 py-3 text-slate-600 font-medium border-r border-slate-100">{ev.divisi}</td>
                              <td className="px-4 py-3 text-slate-500 text-xs border-r border-slate-100">{ev.uploadDate}</td>
                              <td className="px-4 py-3 text-center border-r border-slate-100">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${getStatusColor(ev.status)}`}>
                                  {ev.status === 'Verified' && <CheckCircle size={10}/>}
                                  {ev.status === 'Menunggu Verifikasi' && <Clock size={10}/>}
                                  {ev.status === 'Rejected' && <XCircle size={10}/>}
                                  {ev.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => setViewingDoc({url: ev.fileUrl || '', name: ev.fileName})} className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors border border-transparent hover:border-indigo-200" title="Pratinjau">
                                    <Eye size={16} />
                                  </button>
                                  <a href={(ev.fileUrl || '').replace(/^http:\/\//i, 'https://')} target="_blank" download className="p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 rounded-md transition-colors border border-transparent hover:border-slate-300" title="Unduh Asli">
                                    <Download size={16} />
                                  </a>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TABEL 2: PERMINTAAN DOKUMEN AKTIF */}
                {data.requests.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={16}/> Permintaan Dokumen (Belum Diunggah)
                      </h4>
                      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                        Jumlah: {data.requests.length} Tagihan
                      </span>
                    </div>
                    
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                          <tr>
                            <th className="px-4 py-3 text-center w-12 border-r border-slate-200">No</th>
                            <th className="px-4 py-3 border-r border-slate-200">Rincian Permintaan</th>
                            <th className="px-4 py-3 border-r border-slate-200">Divisi Tujuan</th>
                            <th className="px-4 py-3 border-r border-slate-200">Diminta Oleh</th>
                            <th className="px-4 py-3 text-center">Status Tagihan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.requests.map((req, idx) => (
                            <tr key={req.id} className="hover:bg-slate-50 transition-colors bg-amber-50/10">
                              <td className="px-4 py-3 text-center font-bold text-slate-400 border-r border-slate-100">{idx + 1}</td>
                              <td className="px-4 py-3 border-r border-slate-100 max-w-sm truncate" title={`${req.parameterName} - ${req.note}`}>
                                <p className="font-bold text-slate-800 truncate">{req.parameterName || 'Permintaan Khusus'}</p>
                                {req.note && <p className="text-[10px] text-slate-500 italic mt-0.5 truncate">"{req.note}"</p>}
                              </td>
                              <td className="px-4 py-3 text-amber-700 font-bold border-r border-slate-100">{req.targetDivisi}</td>
                              <td className="px-4 py-3 text-slate-600 text-xs border-r border-slate-100">{req.requestedBy}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border bg-amber-50 text-amber-700 border-amber-200">
                                  Belum Diunggah
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ))
        )}
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
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest">Pratinjau Arsip</p>
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
                   <p className="text-slate-500 text-xs font-medium mb-6">Pratinjau langsung hanya didukung untuk format PDF. Silakan unduh untuk melihat konten.</p>
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