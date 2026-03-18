import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
    Globe, Plus, Trash2, Search, Sparkles, 
    User, MapPin, Package, Building2, Scroll, FileQuestion,
    Loader2, StopCircle
} from 'lucide-react';

interface WorldviewPanelProps {
    projectId: string;
}

export default function WorldviewPanel({ projectId }: WorldviewPanelProps) {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({ name: '', category: 'Character', description: '', status: 'Active' });
    const [adding, setAdding] = useState(false);
    const [analysisStatus, setAnalysisStatus] = useState<{isAnalyzing: boolean, progress: {current: number, total: number}}>({ isAnalyzing: false, progress: {current: 0, total: 0} });

    useEffect(() => {
        loadEntries();
        checkAnalysisProgress();
        const interval = setInterval(checkAnalysisProgress, 2000);
        return () => clearInterval(interval);
    }, [projectId]);

    const checkAnalysisProgress = async () => {
        try {
            const res = await api.getAnalysisProgress(projectId);
            if (res.success) {
                setAnalysisStatus(res.data);
                
                // If analyzing, also reload entries to show real-time updates
                if (res.data.isAnalyzing) {
                    loadEntries();
                }

                if (analysisStatus.isAnalyzing && !res.data.isAnalyzing) {
                    // Just finished
                    loadEntries();
                }
            }
        } catch (e) { console.error(e); }
    };

    const loadEntries = async () => {
        // Only set loading if not analyzing to avoid flickering
        if (!analysisStatus.isAnalyzing) {
             setLoading(true);
        }
        try {
            const res = await api.getWorldview(projectId);
            if (res.success) {
                setEntries(res.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (!analysisStatus.isAnalyzing) {
                setLoading(false);
            }
        }
    };

    const handleAdd = async () => {
        if (!newItem.name || !newItem.description) {
            alert('请填写名称和描述');
            return;
        }
        setAdding(true);
        try {
            const res = await api.addWorldviewEntry(projectId, newItem);
            if (res.success) {
                setNewItem({ name: '', category: 'Character', description: '', status: 'Active' });
                loadEntries();
            } else {
                alert('添加失败');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('确定删除此条目吗？')) return;
        try {
            await api.deleteWorldviewEntry(projectId, id);
            loadEntries();
        } catch (e) {
            console.error(e);
        }
    };

    const handleStartAnalysis = async () => {
        if (!confirm('全量分析将阅读所有章节并自动提取实体状态和伏笔。这可能需要一些时间，确定开始吗？')) return;
        try {
            await api.startFullAnalysis(projectId);
            checkAnalysisProgress();
        } catch (e) { console.error(e); }
    };

    const handleStopAnalysis = async () => {
        if (!confirm('确定停止当前分析任务吗？')) return;
        try {
            await api.stopFullAnalysis(projectId);
            checkAnalysisProgress();
        } catch (e) { console.error(e); }
    };

    const groupedEntries = entries.reduce((acc: any, entry: any) => {
        const cat = entry.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(entry);
        return acc;
    }, {});

    const getCategoryIcon = (cat: string) => {
        switch(cat) {
            case 'Character': return <User size={18} className="text-blue-500"/>;
            case 'Location': return <MapPin size={18} className="text-green-500"/>;
            case 'Item': return <Package size={18} className="text-orange-500"/>;
            case 'Organization': return <Building2 size={18} className="text-purple-500"/>;
            case 'Rule': return <Scroll size={18} className="text-red-500"/>;
            default: return <FileQuestion size={18} className="text-gray-500"/>;
        }
    };

    const getCategoryLabel = (cat: string) => {
        switch(cat) {
            case 'Character': return '角色';
            case 'Location': return '地点';
            case 'Item': return '物品';
            case 'Organization': return '组织';
            case 'Rule': return '法则';
            default: return '其他';
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[500px]">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Globe size={20} className="text-purple-600"/>
                        世界观设定集
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">管理小说中的角色、地点、物品及设定规则</p>
                </div>
                <div className="flex items-center gap-2">
                    {analysisStatus.isAnalyzing && (
                        <button
                            onClick={handleStopAnalysis}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                        >
                            <StopCircle size={16} />
                            <span>停止</span>
                        </button>
                    )}
                    <button 
                        onClick={handleStartAnalysis}
                        disabled={analysisStatus.isAnalyzing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            analysisStatus.isAnalyzing 
                            ? 'bg-indigo-50 text-indigo-700 cursor-not-allowed' 
                            : 'bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm'
                        }`}
                    >
                        {analysisStatus.isAnalyzing ? (
                            <>
                                <Loader2 size={16} className="animate-spin"/>
                                <span>分析中 ({analysisStatus.progress.current}/{analysisStatus.progress.total})</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={16}/>
                                <span>全量智能分析</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
            
            {/* Add New Entry Form */}
            <div className="mb-10 p-5 bg-gray-50/50 rounded-xl border border-gray-100 transition-all hover:border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                    <Plus size={16} className="text-gray-400"/>
                    <h4 className="font-semibold text-sm text-gray-700">添加新条目</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                    <div className="md:col-span-3">
                        <input 
                            type="text" 
                            placeholder="名称 (如: 林萧)" 
                            value={newItem.name}
                            onChange={e => setNewItem({...newItem, name: e.target.value})}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <select 
                            value={newItem.category}
                            onChange={e => setNewItem({...newItem, category: e.target.value})}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all bg-white"
                        >
                            <option value="Character">角色</option>
                            <option value="Location">地点</option>
                            <option value="Item">物品</option>
                            <option value="Organization">组织</option>
                            <option value="Rule">法则</option>
                            <option value="Other">其他</option>
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <input 
                            type="text" 
                            placeholder="状态 (如: 存活, 已毁灭)" 
                            value={newItem.status}
                            onChange={e => setNewItem({...newItem, status: e.target.value})}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all"
                        />
                    </div>
                    <div className="md:col-span-4 flex justify-end">
                         {/* Spacer or additional inputs if needed */}
                    </div>
                </div>
                <div className="relative">
                    <textarea 
                        placeholder="详细描述..." 
                        value={newItem.description}
                        onChange={e => setNewItem({...newItem, description: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all"
                    />
                    <button 
                        onClick={handleAdd}
                        disabled={adding}
                        className="absolute bottom-2 right-2 bg-purple-600 text-white rounded-md px-4 py-1.5 text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {adding ? '添加中...' : '添加'}
                    </button>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-2">
                    <Loader2 size={24} className="animate-spin text-purple-200"/>
                    <span className="text-sm">加载设定中...</span>
                </div>
            ) : entries.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Search size={32} className="mx-auto text-gray-300 mb-3"/>
                    <p className="text-gray-500 font-medium">暂无世界观条目</p>
                    <p className="text-gray-400 text-sm mt-1">请手动添加或使用全量分析自动生成</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {Object.keys(groupedEntries).map(category => (
                        <div key={category}>
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                                {getCategoryIcon(category)}
                                <h4 className="text-base font-bold text-gray-800">
                                    {getCategoryLabel(category)}
                                </h4>
                                <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full ml-1">
                                    {groupedEntries[category].length}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {groupedEntries[category].map((entry: any) => (
                                    <div key={entry.id} className="group relative bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-purple-100 transition-all duration-200">
                                        <div className="flex justify-between items-start mb-2">
                                            <h5 className="font-bold text-gray-900">{entry.name}</h5>
                                            <span className="text-[10px] uppercase tracking-wider bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                                                {entry.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 mb-1" title={entry.description}>
                                            {entry.description}
                                        </p>
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleDelete(entry.id)}
                                                className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                                title="删除"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
