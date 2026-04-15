import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, X, Save, ChevronDown, ChevronRight,
  Database, AlertCircle, CheckCircle,
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

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const token = localStorage.getItem('gcg_token');
        const res = await fetch(`${API_URL}/master-indicators`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
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
      const token = localStorage.getItem('gcg_token');
      const response = await fetch(`${API_URL}/master-indicators/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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
    const finalBobot = isModifier ? 0 : (Number(editState.data.bobot) || 0);

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
    <div className="space-y-8 pb-10 max-w-7xl mx-auto animate-in fade-in duration-500 min-w-0">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
        <div className="flex items-center space-x-5 relative z-10">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 text-white shrink-0">
            <Database className="w-8 h-8" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">Master Data Manager</h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">Struktur Indikator & Parameter GCG</p>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`p-5 rounded-2xl border flex items-center space-x-3 text-sm animate-in slide-in-from-top duration-300 shadow-sm ${ notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700' }`}>
          {notification.type === 'success' ? <CheckCircle size={20} strokeWidth={2.5} /> : <AlertCircle size={20} strokeWidth={2.5} />}
          <span className="font-bold tracking-wide">{notification.message}</span>
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div className="flex flex-wrap gap-3">
        <button onClick={openAddAspect} className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
          <Plus size={18} strokeWidth={3} /><span>Tambah Aspek Baru</span>
        </button>
        <button onClick={handleResetToDefault} className="bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-95">
          <Database size={18} strokeWidth={2} /><span>Muat Template Default</span>
        </button>
      </div>

      {/* TREE VIEW */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm shadow-slate-200/50 overflow-hidden min-h-[300px] relative z-0">
        {masterData.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Database size={40} className="text-slate-300" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-black text-slate-700 mb-2">Database Master Kosong</h3>
            <p className="text-slate-400 text-sm font-medium">Klik "Tambah Aspek Baru" atau muat konfigurasi default untuk memulai.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100/80">
            {masterData.map((aspect) => (
              <div key={aspect.id} className="transition-colors duration-200">
                {/* LEVEL 1: ASPEK */}
                <div className="p-5 hover:bg-indigo-50/30 transition-colors group">
                  <div className="flex items-center justify-between">
                    <button onClick={() => toggleAspect(aspect.id)} className="flex items-center space-x-3 flex-1 text-left">
                      <div className={`p-1.5 rounded-lg transition-colors ${expandedAspects[aspect.id] ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                        {expandedAspects[aspect.id] ? <ChevronDown size={18} strokeWidth={3} /> : <ChevronRight size={18} strokeWidth={3} />}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 tracking-tight text-lg leading-tight flex items-center gap-2">
                          {aspect.name}
                          {aspect.is_modifier && (
                            <span className="text-[9px] font-black tracking-widest uppercase bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md border border-orange-200">PENYESUAI</span>
                          )}
                        </p>
                        <p className={`text-[10px] font-bold tracking-widest uppercase inline-block px-2.5 py-1 rounded-md mt-1.5 shadow-sm ${aspect.is_modifier ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'text-indigo-700 bg-indigo-50 border border-indigo-100'}`}>
                          {aspect.is_modifier ? 'Aspek Ekstra' : `Bobot: ${Number(aspect.bobot || 0).toFixed(3)}`}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center space-x-2 pl-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{aspect.indicators.length} Indikator</span>
                      <button onClick={() => openEditAspect(aspect)} className="p-2 text-indigo-500 hover:bg-indigo-100 hover:text-indigo-700 rounded-xl transition-all"><Edit2 size={16} strokeWidth={2.5} /></button>
                      <button onClick={() => deleteAspect(aspect.id)} className="p-2 text-rose-500 hover:bg-rose-100 hover:text-rose-700 rounded-xl transition-all"><Trash2 size={16} strokeWidth={2.5} /></button>
                    </div>
                  </div>

                  {/* LEVEL 2: INDICATORS */}
                  {expandedAspects[aspect.id] && (
                    <div className="mt-5 ml-[42px] space-y-4 border-l-2 border-indigo-100 pl-5">
                      {aspect.indicators.map((indicator) => (
                        <div key={indicator.id} className="relative">
                          <div className="absolute -left-5 top-4 w-4 border-t-2 border-indigo-100"></div>
                          <div className="flex items-center justify-between group/ind">
                            <button onClick={() => toggleIndicator(`${aspect.id}-${indicator.id}`)} className="flex items-center space-x-3 flex-1 text-left">
                              <div className={`p-1 rounded-md transition-colors ${expandedIndicators[`${aspect.id}-${indicator.id}`] ? 'text-violet-600 bg-violet-100' : 'text-slate-400 bg-slate-50 group-hover/ind:bg-violet-50 group-hover/ind:text-violet-500'}`}>
                                {expandedIndicators[`${aspect.id}-${indicator.id}`] ? <ChevronDown size={16} strokeWidth={3} /> : <ChevronRight size={16} strokeWidth={3} />}
                              </div>
                              <div>
                                <p className="font-bold text-slate-700 text-md leading-snug pr-4">{indicator.name}</p>
                                <p className={`text-[10px] font-bold inline-block px-2 py-0.5 rounded border mt-1 uppercase tracking-wider ${Number(indicator.bobot) < 0 ? 'bg-rose-50 text-rose-600 border-rose-200' : aspect.is_modifier ? 'bg-orange-50 text-orange-600 border-orange-100' : 'text-violet-700 bg-violet-50 border-violet-100'}`}>
                                  Bobot {Number(indicator.bobot) < 0 ? 'Penalti' : aspect.is_modifier ? 'Skor Mutlak' : 'Persentase'}: {Number(indicator.bobot || 0).toFixed(3)}
                                </p>
                              </div>
                            </button>
                            <div className="flex items-center space-x-1 pl-4 shrink-0">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">{indicator.parameters.length} Param</span>
                              <button onClick={() => openEditIndicator(aspect.id, indicator)} className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-lg transition-colors"><Edit2 size={14} strokeWidth={2.5}/></button>
                              <button onClick={() => deleteIndicator(aspect.id, indicator.id)} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"><Trash2 size={14} strokeWidth={2.5}/></button>
                            </div>
                          </div>

                          {/* LEVEL 3: PARAMETERS */}
                          {expandedIndicators[`${aspect.id}-${indicator.id}`] && (
                            <div className="mt-3 ml-7 space-y-3 border-l-2 border-slate-100 pl-4 py-1">
                              {indicator.parameters.map((parameter) => (
                                <div key={parameter.id} className="relative">
                                  <div className="absolute -left-4 top-3.5 w-3 border-t-2 border-slate-100"></div>
                                  <div className="flex items-center justify-between group/param">
                                    <button onClick={() => toggleParameter(`${aspect.id}-${indicator.id}-${parameter.id}`)} className="flex items-center space-x-2 flex-1 text-left">
                                      <div className={`transition-colors ${expandedParameters[`${aspect.id}-${indicator.id}-${parameter.id}`] ? 'text-emerald-500' : 'text-slate-300 group-hover/param:text-emerald-400'}`}>
                                        {expandedParameters[`${aspect.id}-${indicator.id}-${parameter.id}`] ? <ChevronDown size={16} strokeWidth={3} /> : <ChevronRight size={16} strokeWidth={3} />}
                                      </div>
                                      <div>
                                        <p className="font-semibold text-slate-600 text-sm leading-tight pr-4">{parameter.name}</p>
                                        <p className={`text-[9px] font-bold inline-block px-1.5 py-0.5 rounded border mt-0.5 uppercase tracking-wider ${Number(parameter.bobot) < 0 ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                          Bobot {Number(parameter.bobot) < 0 ? 'Penalti' : ''}: {Number(parameter.bobot || 0).toFixed(3)}
                                        </p>
                                      </div>
                                    </button>
                                    <div className="flex items-center space-x-1 shrink-0">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 rounded-sm border border-slate-200">{parameter.factors.length} Uji</span>
                                      <button onClick={() => openEditParameter(aspect.id, indicator.id, parameter)} className="p-1 text-indigo-400 hover:bg-slate-100 rounded transition-colors"><Edit2 size={13} strokeWidth={2.5}/></button>
                                      <button onClick={() => deleteParameter(aspect.id, indicator.id, parameter.id)} className="p-1 text-rose-400 hover:bg-rose-50 rounded transition-colors"><Trash2 size={13} strokeWidth={2.5}/></button>
                                    </div>
                                  </div>

                                  {/* LEVEL 4 & 5: FACTORS & SUB-FACTORS */}
                                  {expandedParameters[`${aspect.id}-${indicator.id}-${parameter.id}`] && (
                                    <div className="mt-2 ml-6 space-y-2 border-l border-dashed border-slate-200 pl-4">
                                      {parameter.factors.map((factor) => (
                                        <div key={factor.id} className="bg-slate-50/50 rounded-xl p-2 border border-slate-100">
                                          <div className="flex items-center justify-between group/fact">
                                            <button onClick={() => toggleFactor(`${aspect.id}-${indicator.id}-${parameter.id}-${factor.id}`)} className="flex items-center space-x-2 flex-1 text-left">
                                              <div className={`transition-colors ${expandedFactors[`${aspect.id}-${indicator.id}-${parameter.id}-${factor.id}`] ? 'text-fuchsia-500' : 'text-slate-300'}`}>
                                                {expandedFactors[`${aspect.id}-${indicator.id}-${parameter.id}-${factor.id}`] ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
                                              </div>
                                              <div><p className="font-semibold text-slate-700 text-xs">{factor.name}</p></div>
                                            </button>
                                            <div className="flex items-center space-x-1">
                                              <button onClick={() => openEditFactor(aspect.id, indicator.id, parameter.id, factor)} className="p-1 text-slate-400 hover:text-indigo-600 rounded"><Edit2 size={12} strokeWidth={2.5}/></button>
                                              <button onClick={() => deleteFactor(aspect.id, indicator.id, parameter.id, factor.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded"><Trash2 size={12} strokeWidth={2.5}/></button>
                                            </div>
                                          </div>
                                          
                                          {/* LEVEL 5 */}
                                          {expandedFactors[`${aspect.id}-${indicator.id}-${parameter.id}-${factor.id}`] && (
                                            <div className="mt-2 ml-4 space-y-1.5 pl-2 border-l border-slate-200">
                                              {factor.subFactors.map((subFactor) => (
                                                <div key={subFactor.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                                                  <div className="flex-1 pr-2"><p className="font-medium text-slate-600 text-[11px] leading-tight break-words">{subFactor.name}</p></div>
                                                  <div className="flex items-center space-x-1 shrink-0">
                                                    <button onClick={() => openEditSubFactor(aspect.id, indicator.id, parameter.id, factor.id, subFactor)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 size={12} strokeWidth={2}/></button>
                                                    <button onClick={() => deleteSubFactor(aspect.id, indicator.id, parameter.id, factor.id, subFactor.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={12} strokeWidth={2}/></button>
                                                  </div>
                                                </div>
                                              ))}
                                              <button onClick={() => openAddSubFactor(aspect.id, indicator.id, parameter.id, factor.id)} className="w-full mt-1 py-1.5 text-[10px] font-black uppercase tracking-widest text-fuchsia-500 hover:bg-fuchsia-50 rounded-lg border border-dashed border-fuchsia-200 transition-all flex justify-center items-center gap-1 active:scale-95"><Plus size={12} strokeWidth={3}/> Sub-Faktor Baru</button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                      <button onClick={() => openAddFactor(aspect.id, indicator.id, parameter.id)} className="w-full mt-1 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-50 rounded-lg border border-dashed border-emerald-200 transition-all flex justify-center items-center gap-1 active:scale-95"><Plus size={12} strokeWidth={3}/> Tambah Faktor Uji</button>
                                    </div>
                                  )}
                                </div>
                              ))}
                              <button onClick={() => openAddParameter(aspect.id, indicator.id)} className="w-full mt-2 py-2 text-[10px] font-black uppercase tracking-widest text-violet-500 hover:bg-violet-50 rounded-xl border border-dashed border-violet-200 transition-all flex justify-center items-center gap-1 active:scale-95"><Plus size={14} strokeWidth={3}/> Tambah Parameter Baru</button>
                            </div>
                          )}
                        </div>
                      ))}
                      <button onClick={() => openAddIndicator(aspect.id)} className="w-full mt-3 py-2.5 text-[11px] font-black uppercase tracking-widest text-indigo-500 hover:bg-indigo-50 rounded-xl border border-dashed border-indigo-200 transition-all flex justify-center items-center gap-1 active:scale-95"><Plus size={14} strokeWidth={3}/> Tambah Indikator GCG</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* COMPACT MODAL CRUD */}
      {editState.mode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-[0.97] duration-300 relative">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white/50 relative z-10">
              <h2 className="font-black text-xl text-slate-800 flex items-center gap-3 tracking-tight">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Database size={20} strokeWidth={2.5}/>
                </div>
                {editState.data.id ? 'Ubah Data' : 'Tambah Baru'} <span className="uppercase text-xs font-black tracking-widest text-slate-400 mt-1 ml-1">({editState.mode})</span>
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:bg-slate-100 hover:text-slate-700 p-2 rounded-xl transition-colors active:scale-90 bg-slate-50 border border-slate-100"><X size={20} strokeWidth={2.5} /></button>
            </div>

            <div className="p-8 space-y-6 bg-white relative z-10">
              
              {/* DROPDOWN TIPE ASPEK */}
              {editState.mode === 'aspect' && (
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-orange-500 transition-colors">Tipe Aspek (Penentu Kalkulasi)</label>
                  <select 
                    className="w-full px-4 py-3.5 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:ring-4 focus:ring-orange-500/10 focus:bg-white focus:border-orange-500 outline-none font-bold text-slate-700 transition-all text-sm appearance-none cursor-pointer"
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
                <textarea className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:ring-4 focus:ring-indigo-600/10 focus:bg-white focus:border-indigo-600 outline-none text-sm font-semibold transition-all text-slate-800 resize-none h-24" value={editState.data.name || ''} onChange={(e) => setEditState({ ...editState, data: { ...editState.data, name: e.target.value } })} placeholder="Ketik rincian..." />
              </div>

              {/* INPUT BOBOT SUPPORT NILAI MINUS (-) */}
              {(editState.mode === 'aspect' || editState.mode === 'indicator' || editState.mode === 'parameter') && (
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-violet-600 transition-colors">Bobot Penilaian (Cth: 7.000 atau -5.000)</label>
                  <input 
                    type="text" 
                    disabled={editState.mode === 'aspect' && String(editState.data.is_modifier) === 'true'}
                    className={`w-full px-4 py-3.5 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-violet-600/10 outline-none font-black transition-all text-lg
                      ${(editState.mode === 'aspect' && String(editState.data.is_modifier) === 'true') 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-slate-50 focus:bg-white focus:border-violet-600 text-violet-700'}`} 
                    placeholder="0.000"
                    value={(editState.mode === 'aspect' && String(editState.data.is_modifier) === 'true') ? '0' : (editState.data.bobot !== undefined ? editState.data.bobot : '')} 
                    onChange={(e) => {
                      const val = e.target.value.replace(',', '.');
                      // Valuasi memperbolehkan karakter minus sendirian sebelum angka
                      if (val === '' || val === '-' || /^-?[0-9.]+$/.test(val)) {
                        setEditState({ ...editState, data: { ...editState.data, bobot: val } });
                      }
                    }} 
                  />
                  {editState.mode === 'aspect' && String(editState.data.is_modifier) === 'true' && (
                    <p className="text-[10px] text-orange-500 font-bold mt-2">⚠️ Aspek Penyesuai tidak memiliki bobot dasar. Nilai diatur di tingkat Indikator.</p>
                  )}
                </div>
              )}

              {editState.mode === 'subfactor' && (
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Deskripsi Syarat Pemenuhan (Opsional)</label>
                  <textarea className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:ring-4 focus:ring-indigo-600/10 focus:bg-white focus:border-indigo-600 outline-none text-sm font-semibold transition-all text-slate-800 resize-none h-20" value={editState.data.description || ''} onChange={(e) => setEditState({ ...editState, data: { ...editState.data, description: e.target.value } })} placeholder="Penjelasan teknis..."/>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button onClick={closeModal} className="w-1/3 px-4 py-4 border-2 border-slate-200 text-slate-500 font-bold uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-colors active:scale-95 text-xs">Batal</button>
                <button onClick={() => { if (editState.mode === 'aspect') saveAspect(); else if (editState.mode === 'indicator') saveIndicator(); else if (editState.mode === 'parameter') saveParameter(); else if (editState.mode === 'factor') saveFactor(); else if (editState.mode === 'subfactor') saveSubFactor(); }} className="w-2/3 relative group overflow-hidden bg-indigo-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-2 text-xs">
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                  <Save size={16} strokeWidth={3} className="relative z-10" /> <span className="relative z-10">SIMPAN DATA</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterDataManager;