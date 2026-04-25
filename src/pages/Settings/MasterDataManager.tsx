import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import {
  Plus, Edit2, Trash2, X, Save, ChevronDown, ChevronRight,
  Database, AlertCircle, CheckCircle, RefreshCw, Layers, AlignLeft, Hash, ListTree
} from 'lucide-react';
import type {
  MasterAspect, MasterIndicator, MasterParameter, MasterFactor, MasterSubFactor,
} from '../../data/masterIndicators';
import { defaultMasterIndicators } from '../../data/masterIndicators';

type EditMode = 'aspect' | 'indicator' | 'parameter' | 'factor' | 'subfactor' | null;

interface EditState {
  mode: EditMode;
  aspectId: string | null;
  indicatorId: string | null;
  parameterId: string | null;
  factorId: string | null;
  subFactorId: string | null;
  data: any;
}

interface ExpandState { [key: string]: boolean; }

const MasterDataManager: React.FC = () => {
  const [masterData, setMasterData] = useState<MasterAspect[]>([]);
  const [expandedAspects, setExpandedAspects] = useState<ExpandState>({});
  const [expandedIndicators, setExpandedIndicators] = useState<ExpandState>({});
  const [expandedParameters, setExpandedParameters] = useState<ExpandState>({});
  const [expandedFactors, setExpandedFactors] = useState<ExpandState>({});
  const [editState, setEditState] = useState<EditState>({
    mode: null, aspectId: null, indicatorId: null, parameterId: null, factorId: null, subFactorId: null, data: {},
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string; } | null>(null);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const res = await fetchApi('/master-indicators', {});
        if (res.ok) {
          const data = await res.json();
          setMasterData(data);
          localStorage.setItem('masterIndicators', JSON.stringify(data)); 
        }
      } catch (err) {
        showNotification('error', 'Gagal memuat data dari server.');
      }
    };
    fetchMasterData();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const syncToServer = async (dataToSync: MasterAspect[]) => {
    try {
      const response = await fetchApi('/master-indicators/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSync)
      });

      if (response.ok) {
        const syncedData = await response.json();
        setMasterData(syncedData); 
        localStorage.setItem('masterIndicators', JSON.stringify(syncedData));
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const updateAndSync = async (newData: MasterAspect[], message: string) => {
    setMasterData(newData);
    closeModal();
    const success = await syncToServer(newData);
    if (success) showNotification('success', message);
    else showNotification('error', 'Gagal menyimpan ke Database Server');
  };

  const toggleAspect = (id: string) => setExpandedAspects((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleIndicator = (key: string) => setExpandedIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleParameter = (key: string) => setExpandedParameters((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleFactor = (key: string) => setExpandedFactors((prev) => ({ ...prev, [key]: !prev[key] }));

  // ==================== ASPECT CRUD ====================
  const openAddAspect = () => setEditState({ mode: 'aspect', aspectId: null, indicatorId: null, parameterId: null, factorId: null, subFactorId: null, data: { id: '', name: '', bobot: '', is_modifier: false } });
  const openEditAspect = (aspect: MasterAspect) => setEditState({ mode: 'aspect', aspectId: aspect.id, indicatorId: null, parameterId: null, factorId: null, subFactorId: null, data: { id: aspect.id, name: aspect.name, bobot: aspect.bobot !== undefined ? Number(aspect.bobot).toFixed(3) : '', is_modifier: aspect.is_modifier || false } });
  
  const saveAspect = () => {
    if (!editState.data.name) return showNotification('error', 'Nama Aspek harus diisi');
    const newData = [...masterData];
    const isModifier = String(editState.data.is_modifier) === 'true';
    const finalBobot = Number(editState.data.bobot) || 0;

    if (editState.aspectId) {
      const idx = newData.findIndex((a) => a.id === editState.aspectId);
      if (idx !== -1) newData[idx] = { ...newData[idx], name: editState.data.name, bobot: finalBobot, is_modifier: isModifier };
    } else {
      newData.push({ id: `temp-${Date.now()}`, name: editState.data.name, bobot: finalBobot, is_modifier: isModifier, indicators: [] });
    }
    updateAndSync(newData, 'Aspek berhasil disimpan ke Database');
  };

  const deleteAspect = (id: string) => {
    if (!window.confirm('Yakin hapus aspek ini dari server? Semua data di bawahnya akan ikut terhapus!')) return;
    const newData = masterData.filter((a) => a.id !== id);
    updateAndSync(newData, 'Aspek berhasil dihapus dari Database');
  };

  // ==================== INDICATOR CRUD ====================
  const openAddIndicator = (aspectId: string) => setEditState({ mode: 'indicator', aspectId, indicatorId: null, parameterId: null, factorId: null, subFactorId: null, data: { id: '', name: '', bobot: '', isAutoId: true } });
  const openEditIndicator = (aspectId: string, indicator: MasterIndicator) => setEditState({ mode: 'indicator', aspectId, indicatorId: indicator.id, parameterId: null, factorId: null, subFactorId: null, data: { id: indicator.id, name: indicator.name, bobot: indicator.bobot !== undefined ? Number(indicator.bobot).toFixed(3) : '' } });

  const saveIndicator = () => {
    if (!editState.data.name) return showNotification('error', 'Nama Indikator harus diisi');
    const newData = [...masterData]; const aspectIdx = newData.findIndex((a) => a.id === editState.aspectId); if (aspectIdx === -1) return;
    if (editState.indicatorId) {
      const indIdx = newData[aspectIdx].indicators.findIndex((i) => i.id === editState.indicatorId);
      if (indIdx !== -1) newData[aspectIdx].indicators[indIdx] = { ...newData[aspectIdx].indicators[indIdx], name: editState.data.name, bobot: Number(editState.data.bobot) || 0 };
    } else {
      newData[aspectIdx].indicators.push({ id: `temp-ind-${Date.now()}`, name: editState.data.name, bobot: Number(editState.data.bobot) || 0, parameters: [] });
    }
    updateAndSync(newData, 'Indikator berhasil disimpan');
  };

  const deleteIndicator = (aspectId: string, indicatorId: string) => {
    if (!window.confirm('Yakin hapus indikator ini?')) return;
    const newData = [...masterData]; const aspectIdx = newData.findIndex((a) => a.id === aspectId);
    if (aspectIdx !== -1) { newData[aspectIdx].indicators = newData[aspectIdx].indicators.filter((i) => i.id !== indicatorId); updateAndSync(newData, 'Indikator dihapus'); }
  };

  // ==================== PARAMETER CRUD ====================
  const openAddParameter = (aspectId: string, indicatorId: string) => setEditState({ mode: 'parameter', aspectId, indicatorId, parameterId: null, factorId: null, subFactorId: null, data: { id: '', name: '', bobot: '', isAutoId: true } });
  const openEditParameter = (aspectId: string, indicatorId: string, parameter: MasterParameter) => setEditState({ mode: 'parameter', aspectId, indicatorId, parameterId: parameter.id, factorId: null, subFactorId: null, data: { id: parameter.id, name: parameter.name, bobot: parameter.bobot !== undefined ? Number(parameter.bobot).toFixed(3) : '' } });

  const saveParameter = () => {
    if (!editState.data.name) return showNotification('error', 'Nama Parameter harus diisi');
    const newData = [...masterData]; const aspectIdx = newData.findIndex((a) => a.id === editState.aspectId); if (aspectIdx === -1) return;
    const indIdx = newData[aspectIdx].indicators.findIndex((i) => i.id === editState.indicatorId); if (indIdx === -1) return;
    if (editState.parameterId) {
      const paramIdx = newData[aspectIdx].indicators[indIdx].parameters.findIndex((p) => p.id === editState.parameterId);
      if (paramIdx !== -1) newData[aspectIdx].indicators[indIdx].parameters[paramIdx] = { ...newData[aspectIdx].indicators[indIdx].parameters[paramIdx], name: editState.data.name, bobot: Number(editState.data.bobot) || 0 };
    } else {
      newData[aspectIdx].indicators[indIdx].parameters.push({ id: `temp-param-${Date.now()}`, name: editState.data.name, bobot: Number(editState.data.bobot) || 0, factors: [] });
    }
    updateAndSync(newData, 'Parameter disimpan');
  };

  const deleteParameter = (aspectId: string, indicatorId: string, parameterId: string) => {
    if (!window.confirm('Yakin hapus parameter ini?')) return;
    const newData = [...masterData]; const aspectIdx = newData.findIndex((a) => a.id === aspectId); const indIdx = newData[aspectIdx].indicators.findIndex((i) => i.id === indicatorId);
    if (indIdx !== -1) { newData[aspectIdx].indicators[indIdx].parameters = newData[aspectIdx].indicators[indIdx].parameters.filter((p) => p.id !== parameterId); updateAndSync(newData, 'Parameter dihapus'); }
  };

  // ==================== FACTOR CRUD ====================
  const openAddFactor = (aspectId: string, indicatorId: string, parameterId: string) => setEditState({ mode: 'factor', aspectId, indicatorId, parameterId, factorId: null, subFactorId: null, data: { id: '', name: '', subFactors: [], isAutoId: true } });
  const openEditFactor = (aspectId: string, indicatorId: string, parameterId: string, factor: MasterFactor) => setEditState({ mode: 'factor', aspectId, indicatorId, parameterId, factorId: factor.id, subFactorId: null, data: { id: factor.id, name: factor.name } });

  const saveFactor = () => {
    if (!editState.data.name) return showNotification('error', 'Nama Faktor Uji harus diisi');
    const newData = [...masterData]; const aspectIdx = newData.findIndex((a) => a.id === editState.aspectId); if (aspectIdx === -1) return;
    const indIdx = newData[aspectIdx].indicators.findIndex((i) => i.id === editState.indicatorId); if (indIdx === -1) return;
    const paramIdx = newData[aspectIdx].indicators[indIdx].parameters.findIndex((p) => p.id === editState.parameterId); if (paramIdx === -1) return;
    if (editState.factorId) {
      const factIdx = newData[aspectIdx].indicators[indIdx].parameters[paramIdx].factors.findIndex((f) => f.id === editState.factorId);
      if (factIdx !== -1) newData[aspectIdx].indicators[indIdx].parameters[paramIdx].factors[factIdx] = { ...newData[aspectIdx].indicators[indIdx].parameters[paramIdx].factors[factIdx], name: editState.data.name };
    } else {
      newData[aspectIdx].indicators[indIdx].parameters[paramIdx].factors.push({ id: `temp-fact-${Date.now()}`, name: editState.data.name, subFactors: [] });
    }
    updateAndSync(newData, 'Faktor Uji disimpan');
  };

  const deleteFactor = (aspectId: string, indicatorId: string, parameterId: string, factorId: string) => {
    if (!window.confirm('Yakin hapus faktor uji ini?')) return;
    const newData = [...masterData]; const aspectIdx = newData.findIndex((a) => a.id === aspectId); const indIdx = newData[aspectIdx].indicators.findIndex((i) => i.id === indicatorId); const paramIdx = newData[aspectIdx].indicators[indIdx].parameters.findIndex((p) => p.id === parameterId);
    if (paramIdx !== -1) { newData[aspectIdx].indicators[indIdx].parameters[paramIdx].factors = newData[aspectIdx].indicators[indIdx].parameters[paramIdx].factors.filter((f) => f.id !== factorId); updateAndSync(newData, 'Faktor Uji dihapus'); }
  };

  // ==================== SUB-FACTOR CRUD ====================
  const openAddSubFactor = (aspectId: string, indicatorId: string, parameterId: string, factorId: string) => {
    setEditState({ mode: 'subfactor', aspectId, indicatorId, parameterId, factorId, subFactorId: null, data: { id: '', name: '', description: '', isAutoId: true } });
  };
  const openEditSubFactor = (aspectId: string, indicatorId: string, parameterId: string, factorId: string, subFactor: MasterSubFactor) => setEditState({ mode: 'subfactor', aspectId, indicatorId, parameterId, factorId, subFactorId: subFactor.id, data: { id: subFactor.id, name: subFactor.name, description: subFactor.description } });

  const saveSubFactor = () => {
    if (!editState.data.name) return showNotification('error', 'Nama Sub-Faktor harus diisi');
    const newData = [...masterData]; const aspectIdx = newData.findIndex((a) => a.id === editState.aspectId); if (aspectIdx === -1) return;
    const indIdx = newData[aspectIdx].indicators.findIndex((i) => i.id === editState.indicatorId); if (indIdx === -1) return;
    const paramIdx = newData[aspectIdx].indicators[indIdx].parameters.findIndex((p) => p.id === editState.parameterId); if (paramIdx === -1) return;
    const factIdx = newData[aspectIdx].indicators[indIdx].parameters[paramIdx].factors.findIndex((f) => f.id === editState.factorId); if (factIdx === -1) return;
    if (editState.subFactorId) {
      const subFactIdx = newData[aspectIdx].indicators[indIdx].parameters[paramIdx].factors[factIdx].subFactors.findIndex((sf) => sf.id === editState.subFactorId);
      if (subFactIdx !== -1) newData[aspectIdx].indicators[indIdx].parameters[paramIdx].factors[factIdx].subFactors[subFactIdx] = { ...newData[aspectIdx].indicators[indIdx].parameters[paramIdx].factors[factIdx].subFactors[subFactIdx], name: editState.data.name, description: editState.data.description };
    } else {
      newData[aspectIdx].indicators[indIdx].parameters[paramIdx].factors[factIdx].subFactors.push({ id: `temp-sub-${Date.now()}`, name: editState.data.name, description: editState.data.description });
    }
    updateAndSync(newData, 'Sub-Faktor disimpan');
  };

  const deleteSubFactor = (aspectId: string, indicatorId: string, parameterId: string, factorId: string, subFactorId: string) => {
    if (!window.confirm('Yakin hapus sub-faktor ini?')) return;
    const newData = [...masterData]; const aspectIdx = newData.findIndex((a) => a.id === aspectId); const indIdx = newData[aspectIdx].indicators.findIndex((i) => i.id === indicatorId); const paramIdx = newData[aspectIdx].indicators[indIdx].parameters.findIndex((p) => p.id === parameterId); const factIdx = newData[aspectIdx].indicators[indIdx].parameters[paramIdx].factors.findIndex((f) => f.id === factorId);
    if (factIdx !== -1) { newData[aspectIdx].indicators[indIdx].parameters[paramIdx].factors[factIdx].subFactors = newData[aspectIdx].indicators[indIdx].parameters[paramIdx].factors[factIdx].subFactors.filter((sf) => sf.id !== subFactorId); updateAndSync(newData, 'Sub-Faktor dihapus'); }
  };

  const handleResetToDefault = () => {
    if (!window.confirm('Yakin load data default ke Database Server? Ini akan menimpa seluruh data saat ini!')) return;
    updateAndSync(defaultMasterIndicators, 'Berhasil menerapkan Data Default ke Server');
  };

  const closeModal = () => setEditState({ mode: null, aspectId: null, indicatorId: null, parameterId: null, factorId: null, subFactorId: null, data: {} });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left pb-10 max-w-7xl mx-auto min-w-0 font-sans">
      
      {/* HEADER & TOOLBAR (Standardized UI) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-600 rounded-xl shadow-md shadow-indigo-200">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Master Data Manager</h1>
            <p className="text-sm font-medium text-slate-500">Struktur Indikator & Parameter GCG</p>
          </div>
        </div>

        {/* NOTIFICATION INLINE */}
        {notification && (
          <div className={`px-4 py-2 rounded-xl border flex items-center space-x-2 text-xs shadow-sm animate-in fade-in slide-in-from-right-4 duration-300 ${ notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700' }`}>
            {notification.type === 'success' ? <CheckCircle size={16} strokeWidth={2.5} /> : <AlertCircle size={16} strokeWidth={2.5} />}
            <span className="font-bold tracking-wide uppercase">{notification.message}</span>
          </div>
        )}
      </div>

      {/* ACTION TOOLBAR */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <button onClick={openAddAspect} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 hover:bg-indigo-700 transition-colors shadow-sm active:scale-95 uppercase tracking-widest">
          <Plus size={16} strokeWidth={3} /><span>Tambah Aspek Baru</span>
        </button>
        <button onClick={handleResetToDefault} className="bg-slate-50 border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm active:scale-95 uppercase tracking-widest">
          <RefreshCw size={16} strokeWidth={2.5} /><span>Muat Template Default</span>
        </button>
      </div>

      {/* MASTER DATA HIERARCHY (CLEAN CARDS) */}
      <div className="space-y-4 relative z-0">
        {masterData.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Database size={32} className="text-slate-300" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-black text-slate-700 mb-1.5 uppercase">Database Master Kosong</h3>
            <p className="text-slate-500 text-sm font-medium">Klik "Tambah Aspek Baru" atau muat konfigurasi default untuk memulai.</p>
          </div>
        ) : (
          masterData.map((aspect) => {
            const isExpandedAspek = expandedAspects[aspect.id];
            return (
              <div key={aspect.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group/aspect transition-all duration-300">
                
                {/* 1. ASPEK HEADER CARD */}
                <div className="p-4 md:p-5 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <button onClick={() => toggleAspect(aspect.id)} className="flex items-start md:items-center space-x-4 flex-1 text-left">
                    <div className={`p-2 rounded-xl transition-colors mt-1 md:mt-0 ${isExpandedAspek ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-200 text-slate-500 group-hover/aspect:bg-indigo-100 group-hover/aspect:text-indigo-600'}`}>
                      {isExpandedAspek ? <ChevronDown size={18} strokeWidth={3} /> : <ChevronRight size={18} strokeWidth={3} />}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 tracking-tight text-lg leading-tight uppercase group-hover/aspect:text-indigo-600 transition-colors">
                        {aspect.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {aspect.is_modifier ? (
                          <span className="text-[10px] font-black tracking-widest uppercase bg-orange-100 text-orange-600 px-2.5 py-1 rounded-lg border border-orange-200">Aspek Penyesuai</span>
                        ) : (
                          <span className="text-[10px] font-black tracking-widest uppercase bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100">Bobot: {Number(aspect.bobot || 0).toFixed(3)}</span>
                        )}
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5"><Layers size={12}/> {aspect.indicators.length} Indikator</span>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0 md:ml-4">
                    <button onClick={() => openEditAspect(aspect)} className="p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors border border-transparent hover:border-indigo-100"><Edit2 size={16} strokeWidth={2.5} /></button>
                    <button onClick={() => deleteAspect(aspect.id)} className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors border border-transparent hover:border-rose-100"><Trash2 size={16} strokeWidth={2.5} /></button>
                  </div>
                </div>

                {/* 2. INDICATORS LIST */}
                {isExpandedAspek && (
                  <div className="p-4 md:p-6 bg-white space-y-4">
                    {aspect.indicators.map((indicator) => {
                      const isExpandedInd = expandedIndicators[`${aspect.id}-${indicator.id}`];
                      return (
                        <div key={indicator.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden group/ind">
                          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
                            <button onClick={() => toggleIndicator(`${aspect.id}-${indicator.id}`)} className="flex items-center space-x-3 flex-1 text-left">
                              <div className={`p-1.5 rounded-lg transition-colors ${isExpandedInd ? 'text-violet-600 bg-violet-100' : 'text-slate-400 bg-slate-100 group-hover/ind:bg-violet-50 group-hover/ind:text-violet-500'}`}>
                                {isExpandedInd ? <ChevronDown size={16} strokeWidth={3} /> : <ChevronRight size={16} strokeWidth={3} />}
                              </div>
                              <div>
                                <p className="font-bold text-slate-700 text-sm leading-snug pr-4">{indicator.name}</p>
                                <p className={`text-[9px] font-bold inline-block px-2 py-0.5 rounded-md border mt-1.5 uppercase tracking-widest ${Number(indicator.bobot) < 0 ? 'bg-rose-50 text-rose-600 border-rose-200' : aspect.is_modifier ? 'bg-orange-50 text-orange-600 border-orange-100' : 'text-violet-700 bg-violet-50 border-violet-100'}`}>
                                  Bobot {Number(indicator.bobot) < 0 ? 'Penalti' : aspect.is_modifier ? 'Skor Mutlak' : 'Persentase'}: {Number(indicator.bobot || 0).toFixed(3)}
                                </p>
                              </div>
                            </button>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-white px-2.5 py-1 rounded-md border border-slate-200 flex items-center gap-1"><AlignLeft size={10}/> {indicator.parameters.length} Param</span>
                              <div className="w-px h-4 bg-slate-200 mx-1"></div>
                              <button onClick={() => openEditIndicator(aspect.id, indicator)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={14} strokeWidth={2.5}/></button>
                              <button onClick={() => deleteIndicator(aspect.id, indicator.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={14} strokeWidth={2.5}/></button>
                            </div>
                          </div>

                          {/* 3. PARAMETERS LIST */}
                          {isExpandedInd && (
                            <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                              {indicator.parameters.map((parameter) => {
                                const isExpandedParam = expandedParameters[`${aspect.id}-${indicator.id}-${parameter.id}`];
                                return (
                                  <div key={parameter.id} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group/param">
                                    <div className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                      <button onClick={() => toggleParameter(`${aspect.id}-${indicator.id}-${parameter.id}`)} className="flex items-center space-x-3 flex-1 text-left">
                                        <div className={`transition-colors ${isExpandedParam ? 'text-emerald-600' : 'text-slate-400 group-hover/param:text-emerald-500'}`}>
                                          {isExpandedParam ? <ChevronDown size={16} strokeWidth={3} /> : <ChevronRight size={16} strokeWidth={3} />}
                                        </div>
                                        <div>
                                          <p className="font-bold text-slate-700 text-xs leading-tight pr-4">{parameter.name}</p>
                                          <p className={`text-[9px] font-bold inline-block px-1.5 py-0.5 rounded border mt-1 uppercase tracking-widest ${Number(parameter.bobot) < 0 ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                            Bobot {Number(parameter.bobot) < 0 ? 'Penalti' : ''}: {Number(parameter.bobot || 0).toFixed(3)}
                                          </p>
                                        </div>
                                      </button>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-white px-2 py-1 rounded-md border border-slate-200 flex items-center gap-1"><Hash size={10}/> {parameter.factors.length} Uji</span>
                                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                        <button onClick={() => openEditParameter(aspect.id, indicator.id, parameter)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Edit2 size={13} strokeWidth={2.5}/></button>
                                        <button onClick={() => deleteParameter(aspect.id, indicator.id, parameter.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"><Trash2 size={13} strokeWidth={2.5}/></button>
                                      </div>
                                    </div>

                                    {/* 4 & 5. FACTORS & SUB-FACTORS */}
                                    {isExpandedParam && (
                                      <div className="p-3 bg-white border-t border-slate-100 space-y-2.5">
                                        {parameter.factors.map((factor) => {
                                          const isExpandedFact = expandedFactors[`${aspect.id}-${indicator.id}-${parameter.id}-${factor.id}`];
                                          return (
                                            <div key={factor.id} className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm group/fact">
                                              <div className="flex items-center justify-between">
                                                <button onClick={() => toggleFactor(`${aspect.id}-${indicator.id}-${parameter.id}-${factor.id}`)} className="flex items-center space-x-2 flex-1 text-left">
                                                  <div className={`transition-colors ${isExpandedFact ? 'text-fuchsia-500' : 'text-slate-300'}`}>
                                                    {isExpandedFact ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
                                                  </div>
                                                  <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">{factor.name}</p>
                                                </button>
                                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                                  <button onClick={() => openEditFactor(aspect.id, indicator.id, parameter.id, factor)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Edit2 size={12} strokeWidth={2.5}/></button>
                                                  <button onClick={() => deleteFactor(aspect.id, indicator.id, parameter.id, factor.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"><Trash2 size={12} strokeWidth={2.5}/></button>
                                                </div>
                                              </div>
                                              
                                              {/* 5. SUB-FACTORS (LEVEL TERBAWAH) */}
                                              {isExpandedFact && (
                                                <div className="mt-3 space-y-1.5 pl-6 border-l-2 border-slate-100 ml-1.5">
                                                  {factor.subFactors.map((subFactor) => (
                                                    <div key={subFactor.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 group/sub">
                                                      <div className="flex-1 pr-3 flex items-start gap-2">
                                                        <ListTree size={12} className="text-slate-400 mt-0.5 shrink-0" />
                                                        <p className="font-semibold text-slate-600 text-[10px] leading-tight break-words">{subFactor.name}</p>
                                                      </div>
                                                      <div className="flex items-center gap-1 shrink-0">
                                                        <button onClick={() => openEditSubFactor(aspect.id, indicator.id, parameter.id, factor.id, subFactor)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors"><Edit2 size={12} strokeWidth={2.5}/></button>
                                                        <button onClick={() => deleteSubFactor(aspect.id, indicator.id, parameter.id, factor.id, subFactor.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-md transition-colors"><Trash2 size={12} strokeWidth={2.5}/></button>
                                                      </div>
                                                    </div>
                                                  ))}
                                                  <button onClick={() => openAddSubFactor(aspect.id, indicator.id, parameter.id, factor.id)} className="w-full mt-2 py-2 text-[9px] font-black uppercase tracking-widest text-fuchsia-500 hover:bg-fuchsia-50 hover:border-fuchsia-300 rounded-lg border-2 border-dashed border-slate-200 transition-all flex justify-center items-center gap-1.5 active:scale-95"><Plus size={12} strokeWidth={3}/> Sub-Faktor Baru</button>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                        <button onClick={() => openAddFactor(aspect.id, indicator.id, parameter.id)} className="w-full mt-2 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 rounded-xl border-2 border-dashed border-slate-200 transition-all flex justify-center items-center gap-1.5 active:scale-95"><Plus size={14} strokeWidth={3}/> Tambah Faktor Uji</button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              <button onClick={() => openAddParameter(aspect.id, indicator.id)} className="w-full mt-2 py-3 text-[10px] font-black uppercase tracking-widest text-violet-600 hover:bg-violet-50 hover:border-violet-300 rounded-xl border-2 border-dashed border-slate-200 transition-all flex justify-center items-center gap-1.5 active:scale-95"><Plus size={14} strokeWidth={3}/> Tambah Parameter Baru</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button onClick={() => openAddIndicator(aspect.id)} className="w-full mt-2 py-3 text-[11px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 rounded-xl border-2 border-dashed border-slate-200 transition-all flex justify-center items-center gap-1.5 active:scale-95"><Plus size={16} strokeWidth={3}/> Tambah Indikator GCG</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* COMPACT MODAL CRUD (Premium Design) */}
      {editState.mode && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-[0.98] duration-200 relative flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-900 shrink-0">
              <h2 className="font-black text-sm text-white flex items-center gap-3 tracking-wide uppercase">
                <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
                  <Database size={18} strokeWidth={2.5}/>
                </div>
                {editState.data.id ? 'Ubah Data' : 'Tambah Baru'} <span className="text-slate-400">({editState.mode})</span>
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:bg-rose-500 hover:text-white p-1.5 rounded-lg transition-colors active:scale-90"><X size={18} strokeWidth={2.5} /></button>
            </div>

            <div className="p-6 space-y-5 bg-white relative overflow-y-auto custom-scrollbar flex-1">
              
              {/* DROPDOWN TIPE ASPEK */}
              {editState.mode === 'aspect' && (
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-orange-500 transition-colors">Tipe Aspek (Penentu Kalkulasi)</label>
                  <select 
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-orange-500/20 focus:bg-white focus:border-orange-500 outline-none font-bold text-slate-700 transition-all text-sm appearance-none cursor-pointer shadow-sm"
                    value={String(editState.data.is_modifier || 'false')}
                    onChange={(e) => setEditState({ ...editState, data: { ...editState.data, is_modifier: e.target.value === 'true' } })}
                  >
                    <option value="false">Aspek Utama (Masuk Perhitungan Persentase 100%)</option>
                    <option value="true">Aspek Penyesuai (Bobot Mutlak Penambah/Pengurang)</option>
                  </select>
                </div>
              )}

              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Uraian / Nama</label>
                <textarea className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-600/20 focus:bg-white focus:border-indigo-600 outline-none text-sm font-semibold transition-all text-slate-800 resize-none h-24 shadow-sm" value={editState.data.name || ''} onChange={(e) => setEditState({ ...editState, data: { ...editState.data, name: e.target.value } })} placeholder="Ketik uraian di sini..." />
              </div>

              {/* INPUT BOBOT SUPPORT NILAI MINUS (-) */}
              {(editState.mode === 'aspect' || editState.mode === 'indicator' || editState.mode === 'parameter') && (
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-violet-600 transition-colors">Bobot Penilaian (Cth: 7.000 atau -5.000)</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-600/20 outline-none font-black transition-all text-base bg-slate-50 focus:bg-white focus:border-violet-600 text-violet-700 shadow-sm"
                    placeholder="0.000"
                    value={editState.data.bobot !== undefined ? editState.data.bobot : ''} 
                    onChange={(e) => {
                      const val = e.target.value.replace(',', '.');
                      if (val === '' || val === '-' || /^-?[0-9.]+$/.test(val)) {
                        setEditState({ ...editState, data: { ...editState.data, bobot: val } });
                      }
                    }} 
                  />
                </div>
              )}

              {editState.mode === 'subfactor' && (
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Deskripsi Syarat Pemenuhan (Opsional)</label>
                  <textarea className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-600/20 focus:bg-white focus:border-indigo-600 outline-none text-sm font-semibold transition-all text-slate-800 resize-none h-20 shadow-sm" value={editState.data.description || ''} onChange={(e) => setEditState({ ...editState, data: { ...editState.data, description: e.target.value } })} placeholder="Penjelasan teknis jika diperlukan..."/>
                </div>
              )}
            </div>

            <div className="px-6 py-5 border-t border-slate-100 flex gap-3 bg-slate-50 shrink-0">
              <button onClick={closeModal} className="w-1/3 px-4 py-3 border border-slate-300 bg-white text-slate-500 font-bold uppercase tracking-widest rounded-xl hover:bg-slate-100 hover:text-slate-700 transition-colors active:scale-95 text-[10px] shadow-sm">Batal</button>
              <button onClick={() => { if (editState.mode === 'aspect') saveAspect(); else if (editState.mode === 'indicator') saveIndicator(); else if (editState.mode === 'parameter') saveParameter(); else if (editState.mode === 'factor') saveFactor(); else if (editState.mode === 'subfactor') saveSubFactor(); }} className="w-2/3 bg-indigo-600 text-white font-black uppercase tracking-widest py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 text-[10px]">
                <Save size={14} strokeWidth={2.5}/> SIMPAN DATA
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterDataManager;