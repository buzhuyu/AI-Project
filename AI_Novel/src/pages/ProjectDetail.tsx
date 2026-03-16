import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import SettingsPanel from '@/components/SettingsPanel';
import WorldviewPanel from '@/components/WorldviewPanel';
import PlotThreadPanel from '@/components/PlotThreadPanel';
import { 
    Book, Globe, Network, Settings, 
    ArrowLeft, Download, Play, StopCircle, 
    Clock, CheckCircle, Edit, Users, Eye, 
    AlertCircle, Wifi, WifiOff 
} from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [apiStatus, setApiStatus] = useState<{success?: boolean; message?: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'chapters' | 'worldview' | 'threads' | 'settings'>('chapters');

  useEffect(() => {
    checkApi();
  }, []);

  useEffect(() => {
    if (id) {
        loadProject(id);
        // Poll for updates if there are active tasks
        const interval = setInterval(() => {
            loadProject(id);
        }, 3000);
        return () => clearInterval(interval);
    }
  }, [id]);

  const loadProject = async (projectId: string) => {
    try {
      const res = await api.getProject(projectId);
      if (res.success) {
        setProject(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const checkApi = async () => {
      try {
          // Use the API_BASE_URL from api lib or relative path
          // Better to add a method to api lib
          const res = await api.checkAI();
          setApiStatus(res);
      } catch (e) {
          setApiStatus({ success: false, message: '无法连接到后端服务' });
      }
  };

  const handleStartWriting = async () => {
    if (!project || !id) return;
    
    // Check API first
    if (!apiStatus?.success) {
        // Support both 'message' and 'error' fields
        const msg = apiStatus?.message || (apiStatus as any)?.error || '未知错误';
        alert(`API检查未通过: ${msg}`);
        return;
    }

    setStarting(true);

    try {
        await api.startProject(id, project.current_chapter);
        loadProject(id);
        alert('已启动创作任务，请点击对应章节进入查看实时生成内容。');
    } catch (error) {
      console.error(error);
      alert('启动失败');
    } finally {
        setStarting(false);
    }
  };

  const handleStop = async () => {
      if (!id) return;
      try {
          await api.stopProject(id);
          loadProject(id);
          alert('项目状态已重置');
      } catch (error) {
          console.error(error);
          alert('重置失败');
      }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center text-gray-400">
        <div className="animate-pulse flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-2"></div>
            加载中...
        </div>
    </div>
  );
  
  if (!project) return <div className="p-8 text-center">项目不存在</div>;

  // Determine active agents based on chapters status
  const hasWriting = project.chapters?.some((c: any) => c.status === 'writing');
  const hasReviewing = project.chapters?.some((c: any) => c.status === 'reviewing_agents' || c.status === 'proofreading');
  const hasEditing = project.chapters?.some((c: any) => c.status === 'editing');
  const hasReading = project.chapters?.some((c: any) => c.status === 'reading');

  const tabs = [
      { id: 'chapters', label: '章节列表', icon: Book },
      { id: 'worldview', label: '世界观', icon: Globe },
      { id: 'threads', label: '伏笔暗线', icon: Network },
      { id: 'settings', label: '设置', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-start gap-6">
        <div>
          <Link to="/dashboard" className="text-gray-500 hover:text-purple-600 mb-3 inline-flex items-center text-sm transition-colors">
            <ArrowLeft size={14} className="mr-1" /> 返回控制台
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{project.name}</h1>
          <p className="text-gray-500 mt-2 max-w-2xl leading-relaxed">{project.description}</p>
          
          {/* API Status Indicator */}
          <div className="mt-4 flex items-center gap-3 text-sm">
            <span className="text-gray-400 flex items-center gap-1.5">
                {apiStatus?.success ? <Wifi size={14} className="text-green-500"/> : <WifiOff size={14} className="text-red-500"/>}
                AI 服务状态:
            </span>
            {apiStatus ? (
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${apiStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {apiStatus.success ? '连接正常' : '连接失败'}
                </span>
            ) : (
                <span className="text-gray-400 text-xs">检查中...</span>
            )}
            {!apiStatus?.success && apiStatus?.message && (
                <span className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle size={12}/> {apiStatus.message}
                </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-4">
            <div className="text-right bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-semibold">当前进度</div>
                <div className="text-2xl font-bold text-purple-600 flex items-baseline justify-end gap-1">
                    {project.total_chapters_count || 0}
                    <span className="text-sm text-gray-400 font-normal">/ {project.target_chapters} 章</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 font-medium">
                    总字数: {(project.total_word_count || 0).toLocaleString()}
                </div>
            </div>
            
            <div className="flex gap-3 items-center">
                <a 
                    href={`/api/projects/${id}/export`} 
                    target="_blank"
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-sm flex items-center gap-2 font-medium shadow-sm"
                >
                    <Download size={16} /> 导出
                </a>

                {project.status !== 'running' ? (
                <button
                    onClick={handleStartWriting}
                    disabled={starting}
                    className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none flex items-center gap-2 font-medium text-sm"
                >
                    {starting ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div> : <Play size={16} fill="currentColor" />}
                    开始创作
                </button>
            ) : (
                <div className="flex gap-2">
                    <button disabled className="px-4 py-2 bg-green-50 text-green-700 border border-green-100 rounded-lg cursor-default flex items-center gap-2 text-sm font-medium">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        创作进行中
                    </button>
                    <button 
                        onClick={handleStop}
                        className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm flex items-center gap-2 font-medium"
                    >
                        <StopCircle size={16} /> 停止
                    </button>
                </div>
            )}
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-gray-200">
        <div className="flex gap-8">
            {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-4 px-2 font-medium text-sm transition-all relative flex items-center gap-2 ${
                            isActive 
                            ? 'text-purple-600' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Icon size={16} />
                        {tab.label}
                        {isActive && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full"></span>
                        )}
                    </button>
                );
            })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'chapters' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold mb-6 text-gray-900 flex items-center gap-2">
                    <Book size={20} className="text-purple-500"/>
                    章节列表
                </h2>
                <div className="space-y-3">
                  {project.chapters?.map((chapter: any) => (
                    <Link 
                        to={`/project/${project.id}/chapter/${chapter.id}`} 
                        key={chapter.id} 
                        className="group block border border-gray-100 rounded-lg p-4 hover:border-purple-200 hover:shadow-md transition-all bg-white"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                            <span className="mr-2 text-gray-400 font-normal text-sm">#{chapter.chapter_number}</span>
                            {chapter.title || (chapter.content ? '（无标题）' : '待创作')}
                        </h3>
                        <div className="flex items-center gap-3">
                            {/* Word Count */}
                            <div className="text-xs text-gray-400 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                                {chapter.status === 'writing' && (
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                )}
                                {chapter.word_count || 0} 字
                            </div>

                            {/* Feedback Count */}
                            {chapter.review_count > 0 && (
                                <span className="px-2 py-1 bg-orange-50 text-orange-600 text-xs rounded font-medium flex items-center gap-1">
                                    <AlertCircle size={12} /> {chapter.review_count}
                                </span>
                            )}

                            <span className={`px-2.5 py-1 text-xs rounded-md font-medium ${
                                chapter.status === 'completed' ? 'bg-green-50 text-green-700' : 
                                chapter.status === 'reviewing_agents' ? 'bg-blue-50 text-blue-700' :
                                chapter.status === 'editing' ? 'bg-indigo-50 text-indigo-700' :
                                chapter.status === 'reading' ? 'bg-pink-50 text-pink-700' :
                                chapter.status === 'reviewing' ? 'bg-purple-50 text-purple-700' :
                                chapter.status === 'writing' ? 'bg-yellow-50 text-yellow-700' :
                                'bg-gray-100 text-gray-500'
                            }`}>
                                {chapter.status === 'writing' ? '创作中' : 
                                chapter.status === 'completed' ? '已完成' : 
                                chapter.status === 'reviewing_agents' ? '多智能体联审' :
                                chapter.status === 'editing' ? '编辑会审' :
                                chapter.status === 'reading' ? '读者试读' :
                                chapter.status === 'reviewing' ? '待确认' : '待创作'}
                            </span>
                        </div>
                      </div>
                      <div className="text-gray-500 text-sm line-clamp-2 pl-8 border-l-2 border-gray-100 mt-2">
                          {chapter.content ? chapter.content.substring(0, 120) + '...' : '暂无内容 - 点击进入详情查看'}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
          )}

          {activeTab === 'worldview' && (
              <WorldviewPanel projectId={id!} />
          )}

          {activeTab === 'threads' && (
              <PlotThreadPanel projectId={id!} />
          )}

          {activeTab === 'settings' && (
              <SettingsPanel 
                  projectId={id!} 
                  initialSettings={{
                      ...project.settings,
                      name: project.name,
                      description: project.description,
                      target_words: project.target_words
                  }} 
                  onUpdate={() => loadProject(id!)}
              />
          )}
        </div>

        {/* Sidebar - Agents Status */}
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
                <h2 className="text-lg font-bold mb-6 text-gray-900">智能体工作流</h2>
                <div className="space-y-6 relative">
                    {/* Connecting Line */}
                    <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gray-100 -z-10"></div>

                    <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 bg-white ${hasWriting ? 'border-yellow-400 text-yellow-500 shadow-yellow-100 shadow-md' : 'border-gray-200 text-gray-300'}`}>
                            <Edit size={14} />
                        </div>
                        <div>
                            <div className={`font-medium text-sm ${hasWriting ? 'text-gray-900' : 'text-gray-500'}`}>写手智能体</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                                {hasWriting ? '正在撰写内容...' : '待机中'}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 bg-white ${hasReviewing ? 'border-blue-400 text-blue-500 shadow-blue-100 shadow-md' : 'border-gray-200 text-gray-300'}`}>
                            <CheckCircle size={14} />
                        </div>
                        <div>
                            <div className={`font-medium text-sm ${hasReviewing ? 'text-gray-900' : 'text-gray-500'}`}>联合审校组</div>
                            <div className="text-xs text-gray-400 mt-0.5 mb-2">
                                {hasReviewing ? '四方会审中...' : '待机中'}
                            </div>
                            <div className="flex gap-1 flex-wrap">
                                {['校对', '逻辑', '修辞', '连贯性'].map(role => (
                                    <span key={role} className={`px-1.5 py-0.5 rounded text-[10px] ${hasReviewing ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                                        {role}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 bg-white ${hasEditing ? 'border-indigo-400 text-indigo-500 shadow-indigo-100 shadow-md' : 'border-gray-200 text-gray-300'}`}>
                            <Users size={14} />
                        </div>
                        <div>
                            <div className={`font-medium text-sm ${hasEditing ? 'text-gray-900' : 'text-gray-500'}`}>编辑委员会</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                                {hasEditing ? '编辑会审中...' : '待机中'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 bg-white ${hasReading ? 'border-pink-400 text-pink-500 shadow-pink-100 shadow-md' : 'border-gray-200 text-gray-300'}`}>
                            <Eye size={14} />
                        </div>
                        <div>
                            <div className={`font-medium text-sm ${hasReading ? 'text-gray-900' : 'text-gray-500'}`}>读者试读团</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                                {hasReading ? '试读反馈中...' : '待机中'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold mb-4 text-gray-900">项目信息</h2>
                <div className="text-sm space-y-4">
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                        <span className="text-gray-500">类型</span>
                        <span className="font-medium text-gray-900">{project.settings.novelType}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                        <span className="text-gray-500">目标字数</span>
                        <span className="font-medium text-gray-900">{project.target_words.toLocaleString()} 字</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                        <span className="text-gray-500">创建时间</span>
                        <span className="font-medium text-gray-900">{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
