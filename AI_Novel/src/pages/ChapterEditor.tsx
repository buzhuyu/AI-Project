import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import AIAssistantPanel from '@/components/editor/AIAssistantPanel';
import { 
    ArrowLeft, MessageSquare, Globe, Square, 
    Check, Search, Save, CheckCircle, SkipForward, 
    Sparkles, MapPin, X, Plus,
    User, Settings, PenTool, BookOpen, ChevronRight, ChevronLeft
} from 'lucide-react';
import RichTextEditor from '@/components/editor/RichTextEditor';

export default function ChapterEditor() {
  const { projectId, chapterId } = useParams<{ projectId: string; chapterId: string }>();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [streamContent, setStreamContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [localContent, setLocalContent] = useState('');
  const [localTitle, setLocalTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [proofreading, setProofreading] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeSidebar, setActiveSidebar] = useState<'reviews' | 'worldview' | null>(null);
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(true);
  const [instruction, setInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [worldviewEntries, setWorldviewEntries] = useState<any[]>([]);
  
  const streamStartedRef = useRef(false);

  useEffect(() => {
    if (projectId && chapterId) {
      loadData();
      loadReviews();
      loadWorldview();
    }
    // Reset streaming state when chapterId changes
    streamStartedRef.current = false;
    setIsStreaming(false);
    setStreamContent('');
    setActiveSidebar(null);
  }, [projectId, chapterId]);

  const loadWorldview = async () => {
      if (!projectId) return;
      try {
          const res = await api.getWorldview(projectId);
          if (res.success) setWorldviewEntries(res.data);
      } catch (e) { console.error(e); }
  };

  const loadData = async () => {
    try {
      const [projRes, chapRes] = await Promise.all([
        api.getProject(projectId!),
        api.getChapter(chapterId!) 
      ]);

      if (projRes.success) setProject(projRes.data);
      if (chapRes.success) {
          const chap = chapRes.data;
          setChapter(chap);
          setLocalContent(chap.content || '');
          setLocalTitle(chap.title || '');
          
          if (chap.status === 'writing' && !streamStartedRef.current) {
              startStreaming(chap);
          }
      }
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
      if (!chapterId) return;
      try {
          const res = await api.getReviews(chapterId);
          if (res.success) setReviews(res.data);
      } catch (e) { console.error(e); }
  };

  const startStreaming = (chap: any) => {
      streamStartedRef.current = true;
      setIsStreaming(true);
      setStreamContent(chap.content || '');

      const eventSource = new EventSource(`/api/projects/${projectId}/chapters/${chap.chapter_number}/stream`);
      
      eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          if (data.error) {
              console.error('Stream Error:', data.error);
              eventSource.close();
              setIsStreaming(false);
              alert('生成出错: ' + data.error);
              return;
          }

          if (data.done) {
              eventSource.close();
              setIsStreaming(false);
              api.getChapter(chapterId!).then(res => {
                  if (res.success) {
                      setChapter(res.data);
                      setLocalContent(res.data.content || '');
                  }
              });
              return;
          }

          if (data.content) {
              setStreamContent(prev => prev + data.content);
          }
      };

      eventSource.onerror = (err) => {
          console.error('EventSource failed:', err);
          eventSource.close();
          setIsStreaming(false);
      };
  };

  const handleSave = async (silent = false) => {
      if (!chapterId) return;
      if (!silent) setSaving(true);
      try {
          await api.updateChapter(chapterId, localContent, localTitle);
          if (!silent) alert('保存成功');
      } catch (error) {
          console.error(error);
          if (!silent) alert('保存失败');
      } finally {
          if (!silent) setSaving(false);
      }
  };

  const handleConfirm = async () => {
      await handleSave(true);
      setConfirming(true);
      try {
          const res = await api.confirmChapter(chapterId!);
          if (res.success) {
              alert('已提交审核！智能体将开始校对和审阅。');
              navigate(`/project/${projectId}`, { replace: true });
          }
      } catch (error) {
          console.error(error);
          alert('确认失败');
      } finally {
          setConfirming(false);
      }
  };

  const handleManualProofread = async () => {
      await handleSave(true);
      setProofreading(true);
      try {
          const res = await api.proofreadChapter(chapterId!);
          if (res.success) {
              alert('校对完成！请查看反馈。');
              loadReviews();
              setActiveSidebar('reviews');
          }
      } catch (error) {
          console.error(error);
          alert('校对请求失败');
      } finally {
          setProofreading(false);
      }
  };

  const handleStop = async () => {
      if (!project || !chapter) return;
      try {
          await api.stopChapterGeneration(project.id, chapter.chapter_number);
          setIsStreaming(false);
          loadData();
      } catch (error) {
          console.error(error);
      }
  };

  const handleContinue = async () => {
      if (!project || !chapter) return;
      setIsProcessing(true);
      await handleSave(true); 
      try {
          const res = await api.continueChapterGeneration(project.id, chapter.chapter_number, localContent, instruction);
          if (res.success) {
              setInstruction(''); 
              const updatedChapter = { ...chapter, content: localContent, status: 'writing' };
              setChapter(updatedChapter);
              startStreaming(updatedChapter);
          } else {
              alert('续写请求失败: ' + (res.error || res.message));
          }
      } catch (error) {
          console.error(error);
          alert('续写请求出错');
      } finally {
          setIsProcessing(false);
      }
  };

  const handleRewrite = async () => {
      if (!project || !chapter) return;
      if (!confirm('确定要重写本章吗？当前内容将被清空。')) return;
      
      setIsProcessing(true);
      // 清空本地内容
      setLocalContent('');
      setLocalTitle('');
      
      try {
          // 保存空内容到数据库
          await api.updateChapter(chapterId!, '', '');
          
          // 发起重写请求 (相当于以空内容继续生成，并在 instruction 中强调重写)
          const res = await api.continueChapterGeneration(
              project.id, 
              chapter.chapter_number, 
              '', 
              '请完全重写本章内容，之前的版本不合适。' + (instruction ? ` 特别注意：${instruction}` : '')
          );
          
          if (res.success) {
              setInstruction(''); 
              const updatedChapter = { ...chapter, content: '', title: '', status: 'writing' };
              setChapter(updatedChapter);
              startStreaming(updatedChapter);
          } else {
              alert('重写请求失败: ' + (res.error || res.message));
          }
      } catch (error) {
          console.error(error);
          alert('重写请求出错');
      } finally {
          setIsProcessing(false);
      }
  };

  const handleSelectAll = () => {
      // TODO: Implement select all for TipTap
      alert('请使用 Ctrl+A / Cmd+A 全选');
  };

  const scrollToText = (text: string) => {
      // TODO: Implement scroll to text for TipTap
      console.log('Scroll to text not implemented yet for RichEditor', text);
  };

  const applyFix = (quote: string, replacement: string) => {
      const content = localContent;
      if (content.includes(quote)) {
          const newContent = content.replace(quote, replacement || '');
          setLocalContent(newContent);
          // Note: RichTextEditor will update because content prop changes
      } else {
          alert('无法应用修改：原文未找到');
      }
  };

  const handleAIAction = (action: string, selectedText: string) => {
      if (!selectedText) return;
      if (action === 'polish') {
          setInstruction(`请润色以下内容：\n${selectedText}`);
      } else if (action === 'expand') {
          setInstruction(`请扩写以下内容：\n${selectedText}`);
      }
      // Focus instruction input?
      document.getElementById('instruction-input')?.focus();
  };

  if (loading) return (
      <div className="flex h-screen items-center justify-center text-gray-400">
          <div className="animate-pulse flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-2"></div>
              加载中...
          </div>
      </div>
  );
  if (!chapter) return <div className="p-8 text-center">章节不存在</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 relative">
        {/* Main Editor (Full Width) */}
        <div className="bg-white min-h-screen shadow-sm rounded-xl p-8 relative border border-gray-100 flex flex-col">
            <div className="mb-6 border-b border-gray-100 pb-4 flex justify-between items-center">
                <div>
                    <Link to={`/project/${projectId}`} className="text-sm text-gray-500 hover:text-purple-600 mb-1 inline-flex items-center gap-1 transition-colors">
                        <ArrowLeft size={14}/> 返回章节列表
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-bold text-gray-900 tracking-tight whitespace-nowrap">
                            第{chapter.chapter_number}章：
                        </span>
                        <input
                            type="text"
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            className="text-2xl font-bold text-gray-900 tracking-tight bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 focus:outline-none transition-colors w-full px-1"
                            placeholder="输入章节标题"
                        />
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        (chapter.status === 'completed') ? 'bg-green-50 text-green-700' : 
                        (chapter.status === 'writing' || isStreaming) ? 'bg-yellow-50 text-yellow-700' :
                        (chapter.status === 'reviewing') ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-50 text-gray-600'
                    }`}>
                        {isStreaming ? '正在创作中...' : 
                        chapter.status === 'writing' ? '等待创作' : 
                        chapter.status === 'reviewing' ? '待确认' :
                        chapter.status === 'completed' ? '已完成' : 
                        chapter.status === 'proofreading' ? '校对中' :
                        chapter.status === 'editing' ? '编辑中' :
                        chapter.status === 'reading' ? '试读中' : '草稿'}
                    </span>
                    <button 
                        onClick={() => setActiveSidebar(activeSidebar === 'reviews' ? null : 'reviews')}
                        className={`ml-2 text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                            activeSidebar === 'reviews' 
                            ? 'bg-purple-50 text-purple-700 font-medium' 
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        title="查看智能体反馈"
                    >
                        <MessageSquare size={16}/> 
                        反馈 
                        {reviews.length > 0 && <span className="bg-purple-100 text-purple-600 text-[10px] px-1.5 rounded-full ml-0.5">{reviews.length}</span>}
                    </button>
                    <button 
                        onClick={() => setActiveSidebar(activeSidebar === 'worldview' ? null : 'worldview')}
                        className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                            activeSidebar === 'worldview' 
                            ? 'bg-purple-50 text-purple-700 font-medium' 
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        title="查看世界观"
                    >
                        <Globe size={16}/> 世界观
                    </button>
                </div>
            </div>

            <div className="relative group flex-1 flex flex-col">
                {/* Toolbar */}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/90 backdrop-blur-sm p-1.5 rounded-lg shadow-sm border border-gray-200 z-10">
                    {isStreaming && (
                            <button 
                            onClick={handleStop}
                            className="text-xs px-2.5 py-1.5 bg-red-50 hover:bg-red-100 rounded-md text-red-600 flex items-center gap-1 font-medium transition-colors"
                        >
                            <Square size={12} fill="currentColor"/> 停止生成
                        </button>
                    )}
                    <button 
                        onClick={handleSelectAll}
                        className="text-xs px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
                    >
                        全选
                    </button>
                    <button 
                        onClick={handleManualProofread}
                        disabled={proofreading}
                        className="text-xs px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md text-blue-600 flex items-center gap-1 transition-colors"
                    >
                        <Search size={12}/> {proofreading ? '体检中...' : '全面体检'}
                    </button>
                    <button 
                        onClick={() => handleSave()}
                        disabled={saving}
                        className="text-xs px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 rounded-md text-purple-600 flex items-center gap-1 transition-colors"
                    >
                        <Save size={12}/> {saving ? '保存中...' : '保存'}
                    </button>
                </div>

                <RichTextEditor
                    content={localContent}
                    onChange={setLocalContent}
                    isStreaming={isStreaming}
                    streamContent={streamContent}
                    className="flex-1 min-h-[500px]"
                    onAIAction={handleAIAction}
                />
            </div>
            
            {/* Action Bar for Reviewing */}
            {chapter.status === 'reviewing' && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md shadow-xl rounded-full px-6 py-3 flex gap-3 border border-purple-100 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <button 
                        onClick={() => handleSave()}
                        className="px-5 py-2 border border-gray-200 rounded-full hover:bg-gray-50 text-gray-600 text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Save size={16}/> 保存修改
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={confirming}
                        className="px-5 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all text-sm font-medium flex items-center gap-2"
                    >
                        {confirming ? '提交中...' : <><CheckCircle size={16}/> 确认并继续</>}
                    </button>
                    <button 
                        onClick={async () => {
                            if (!confirm('确定要跳过当前章节的审核，直接开始创作下一章吗？\n当前章节将继续在后台进行审校和修改。')) return;
                            try {
                                const res = await api.startNextChapter(projectId!, chapter.chapter_number);
                                if (res.success) {
                                    alert('下一章创作已启动！');
                                    navigate(`/project/${projectId}`);
                                }
                            } catch (e) {
                                console.error(e);
                                alert('启动失败');
                            }
                        }}
                        className="px-5 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all text-sm font-medium flex items-center gap-2"
                    >
                        <SkipForward size={16}/> 仅确认并开启下一章
                    </button>
                </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400 flex justify-between font-mono">
                <span>字数统计: {isStreaming ? streamContent.length : localContent.length} 字</span>
                <span>最后更新: {new Date(chapter.updated_at).toLocaleString()}</span>
            </div>
        </div>

        {/* Floating AI Assistant (Fixed Position) */}
        <div 
            className={`fixed right-8 top-24 z-[100] transition-all duration-300 ease-in-out ${
                isAISidebarOpen ? 'w-80' : 'w-12'
            }`}
        >
            <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 ${
                isAISidebarOpen ? 'h-auto max-h-[80vh]' : 'h-12 w-12 rounded-full'
            }`}>
                {/* Header / Toggle Area */}
                <div className={`flex items-center ${isAISidebarOpen ? 'justify-between p-4 border-b border-gray-50' : 'justify-center h-full w-full'}`}>
                    {isAISidebarOpen && (
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                            <Sparkles size={16} className="text-purple-500"/> AI 助手
                        </h3>
                    )}
                    <button 
                        onClick={() => setIsAISidebarOpen(!isAISidebarOpen)}
                        className={`text-gray-400 hover:text-purple-600 transition-colors ${!isAISidebarOpen && 'w-full h-full flex items-center justify-center'}`}
                        title={isAISidebarOpen ? "收起" : "展开 AI 助手"}
                    >
                        {isAISidebarOpen ? <ChevronRight size={18}/> : <Sparkles size={20} className="text-purple-500"/>}
                    </button>
                </div>

                {/* Panel Content */}
                {isAISidebarOpen && (
                    <div className="p-4 max-h-[calc(80vh-60px)] overflow-y-auto">
                        <AIAssistantPanel
                            instruction={instruction}
                            setInstruction={setInstruction}
                            handleContinue={handleContinue}
                            handleRewrite={handleRewrite}
                            isProcessing={isProcessing}
                            isStreaming={isStreaming}
                        />
                    </div>
                )}
            </div>
        </div>

        {/* Reviews Sidebar (Overlay) */}
        {activeSidebar === 'reviews' && (
            <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 p-6 border-l border-gray-100 overflow-y-auto animate-in slide-in-from-right duration-300">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <MessageSquare size={18} className="text-purple-500"/> 智能体反馈
                    </h3>
                    <button onClick={() => setActiveSidebar(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18}/>
                    </button>
                </div>
                <div className="space-y-4">
                    {reviews.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                                <MessageSquare size={24}/>
                            </div>
                            <p className="text-gray-400 text-sm">暂无反馈记录</p>
                        </div>
                    ) : (
                        reviews.map((review: any) => (
                            <div key={review.id} className="bg-gray-50/50 p-4 rounded-xl text-sm border border-gray-100 hover:border-purple-100 transition-colors">
                                <div className="flex justify-between mb-3 items-center">
                                    <span className={`font-semibold flex items-center gap-1.5 ${
                                        review.agent_type.includes('proofreader') ? 'text-blue-600' :
                                        review.agent_type.includes('editor') ? 'text-indigo-600' :
                                        'text-purple-600'
                                    }`}>
                                        <User size={14}/>
                                        {review.agent_type.includes('proofreader') ? '校对' :
                                         review.agent_type.includes('editor_chief') ? '主编' : 
                                         review.agent_type.includes('editor_plot') ? '剧情编辑' : 
                                         review.agent_type.includes('editor') ? '编辑' : 
                                         review.agent_type.includes('reader') ? '读者' :
                                         'AI 助手'}
                                    </span>
                                    <span className="text-gray-300 text-xs">{new Date(review.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="mb-3 text-gray-600 whitespace-pre-wrap leading-relaxed">{review.feedback?.content}</div>
                                
                                {/* Structured Issues List */}
                                {review.suggestions && review.suggestions.some((s: any) => typeof s === 'object') ? (
                                    <div className="space-y-2.5 mt-3 pt-3 border-t border-gray-100">
                                        {review.suggestions.filter((s: any) => typeof s === 'object').map((issue: any, idx: number) => (
                                            <div key={idx} className="bg-white p-2.5 rounded-lg border border-red-100 shadow-sm">
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider bg-red-50 px-1.5 py-0.5 rounded">{issue.type}</span>
                                                    <div className="flex gap-1.5">
                                                        <button 
                                                            onClick={() => scrollToText(issue.quote)}
                                                            className="text-gray-400 hover:text-purple-600 transition-colors p-0.5"
                                                            title="定位"
                                                        >
                                                            <MapPin size={12}/>
                                                        </button>
                                                        {issue.replacement !== undefined && (
                                                            <button 
                                                                onClick={() => applyFix(issue.quote, issue.replacement)}
                                                                className="text-gray-400 hover:text-green-600 transition-colors p-0.5"
                                                                title="应用"
                                                            >
                                                                <Check size={12}/>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-400 line-through truncate mb-1">{issue.quote}</div>
                                                {issue.replacement && (
                                                    <div className="text-xs text-green-600 font-medium mb-1 flex items-center gap-1">
                                                        <ArrowLeft size={10} className="rotate-180"/> {issue.replacement || '(删除)'}
                                                    </div>
                                                )}
                                                <div className="text-xs text-gray-500 leading-snug">{issue.explanation}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {/* Worldview Sidebar (Overlay) */}
        {activeSidebar === 'worldview' && (
            <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 p-6 border-l border-gray-100 overflow-y-auto animate-in slide-in-from-right duration-300">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Globe size={18} className="text-purple-500"/> 世界观参考
                    </h3>
                    <button onClick={() => setActiveSidebar(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18}/>
                    </button>
                </div>
                <div className="space-y-4">
                    {worldviewEntries.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                                <BookOpen size={24}/>
                            </div>
                            <p className="text-gray-400 text-sm">暂无记录</p>
                        </div>
                    ) : (
                        worldviewEntries.map((entry: any) => (
                            <div key={entry.id} className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 hover:border-purple-100 hover:bg-white transition-all group">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="font-bold text-purple-700 text-xs flex items-center gap-1">
                                        <Settings size={10}/> {entry.category}
                                    </span>
                                    <span className="text-[10px] bg-white border border-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{entry.status}</span>
                                </div>
                                <h4 className="font-bold text-gray-800 mb-1 text-sm">{entry.name}</h4>
                                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">{entry.description}</p>
                                <button 
                                    onClick={() => {
                                        setLocalContent(prev => prev + '\n' + entry.name);
                                        // TODO: Insert at cursor position if possible
                                    }}
                                    className="text-[10px] text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Plus size={10}/> 插入正文
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}
    </div>
  );
}
