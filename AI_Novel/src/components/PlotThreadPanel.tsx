import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
    Network, Plus, Trash2, Check, CheckCircle2, 
    Circle, ArrowRight, Loader2, Search
} from 'lucide-react';

interface PlotThreadPanelProps {
    projectId: string;
}

export default function PlotThreadPanel({ projectId }: PlotThreadPanelProps) {
    const [threads, setThreads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newThread, setNewThread] = useState('');
    const [startChapter, setStartChapter] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        loadThreads();
    }, [projectId]);

    const loadThreads = async () => {
        setLoading(true);
        try {
            const res = await api.getPlotThreads(projectId);
            if (res.success) {
                setThreads(res.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newThread) return;
        setAdding(true);
        try {
            const res = await api.addPlotThread(projectId, {
                content: newThread,
                start_chapter_number: startChapter ? parseInt(startChapter) : null
            });
            if (res.success) {
                setNewThread('');
                setStartChapter('');
                loadThreads();
            } else {
                alert('添加失败');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setAdding(false);
        }
    };

    const handleResolve = async (threadId: string) => {
        if (!confirm('确定已回收此伏笔吗？')) return;
        try {
            await api.updatePlotThread(projectId, threadId, { status: 'resolved' });
            loadThreads();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (threadId: string) => {
        if (!confirm('确定删除此记录吗？')) return;
        try {
            await api.deletePlotThread(projectId, threadId);
            loadThreads();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[500px]">
            <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Network size={20} className="text-purple-600"/>
                    伏笔与暗线追踪
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                    记录未解之谜与伏笔，AI 将在后续创作中尝试回收
                </p>
            </div>

            {/* Add Form */}
            <div className="mb-10 p-5 bg-purple-50/50 rounded-xl border border-purple-100 transition-all hover:border-purple-200">
                <div className="flex items-center gap-2 mb-4">
                    <Plus size={16} className="text-purple-400"/>
                    <h4 className="font-semibold text-sm text-purple-900">埋下新伏笔</h4>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                    <input 
                        type="text" 
                        placeholder="伏笔内容 (如: 主角捡到的神秘钥匙)" 
                        value={newThread}
                        onChange={e => setNewThread(e.target.value)}
                        className="flex-1 border border-purple-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all bg-white"
                    />
                    <div className="flex gap-3">
                        <input 
                            type="number" 
                            placeholder="起始章节" 
                            value={startChapter}
                            onChange={e => setStartChapter(e.target.value)}
                            className="w-24 border border-purple-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all bg-white"
                        />
                        <button 
                            onClick={handleAdd}
                            disabled={adding || !newThread}
                            className="bg-purple-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap shadow-sm flex items-center gap-2 transition-all"
                        >
                            {adding ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}
                            记录
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-2">
                    <Loader2 size={24} className="animate-spin text-purple-200"/>
                    <span className="text-sm">加载伏笔中...</span>
                </div>
            ) : threads.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Search size={32} className="mx-auto text-gray-300 mb-3"/>
                    <p className="text-gray-500 font-medium">暂无伏笔记录</p>
                    <p className="text-gray-400 text-sm mt-1">手动添加或等待 AI 自动发现</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {threads.map((thread) => (
                        <div key={thread.id} className={`p-5 rounded-xl border transition-all duration-200 flex flex-col md:flex-row justify-between items-start gap-4 group ${
                            thread.status === 'resolved' 
                            ? 'bg-gray-50 border-gray-100 opacity-75 hover:opacity-100' 
                            : 'bg-white border-gray-200 hover:border-purple-200 hover:shadow-sm'
                        }`}>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                                        thread.status === 'resolved' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-red-50 text-red-600'
                                    }`}>
                                        {thread.status === 'resolved' 
                                            ? <><CheckCircle2 size={12}/> 已回收</> 
                                            : <><Circle size={12}/> 未回收</>
                                        }
                                    </span>
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        始于第 {thread.start_chapter_number || '?'} 章
                                    </span>
                                    {thread.resolved_chapter_number && (
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <ArrowRight size={12}/> 终于第 {thread.resolved_chapter_number} 章
                                        </span>
                                    )}
                                </div>
                                <p className={`text-sm leading-relaxed ${
                                    thread.status === 'resolved' ? 'text-gray-500 line-through' : 'text-gray-900 font-medium'
                                }`}>
                                    {thread.content}
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                {thread.status !== 'resolved' && (
                                    <button 
                                        onClick={() => handleResolve(thread.id)}
                                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                                        title="标记为已解决"
                                    >
                                        <Check size={12}/> 回收
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleDelete(thread.id)}
                                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-gray-50 text-gray-500 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                    title="删除"
                                >
                                    <Trash2 size={12}/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
