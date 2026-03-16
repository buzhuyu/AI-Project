import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import ImportModal from '@/components/ImportModal';
import { BookOpen, Plus, Download, FolderPlus, AlignLeft, Trash2 } from 'lucide-react';

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const loadProjects = async () => {
    // ... (existing code) ...
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const res = await api.getProjects(user.id);
        if (res.success) {
          setProjects(res.data);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string, projectName: string) => {
      e.preventDefault(); // Prevent navigation
      if (confirm(`确定要删除作品《${projectName}》吗？\n删除后无法恢复，所有章节、设定和进度都将丢失。`)) {
          try {
              const res = await api.deleteProject(projectId);
              if (res.success) {
                  setProjects(prev => prev.filter(p => p.id !== projectId));
              } else {
                  alert('删除失败: ' + res.error);
              }
          } catch (error) {
              console.error(error);
              alert('删除请求出错');
          }
      }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    // ... (existing JSX) ...
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-10">
        {/* ... Header ... */}
        <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">创作控制台</h1>
            <p className="text-gray-500 mt-1 text-sm">管理您的所有小说项目</p>
        </div>
        <div className="flex gap-3">
            {/* ... Tier Selector and Buttons ... */}
            <select 
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                onChange={(e) => {
                    const tier = e.target.value;
                    console.log('Switched to tier:', tier);
                    localStorage.setItem('mock_tier', tier);
                    alert(`模拟切换为 ${tier} 用户 (需后端配合生效)`);
                }}
                defaultValue="free"
            >
                <option value="free">Free User</option>
                <option value="pro">Pro User</option>
                <option value="ultra">Ultra User</option>
            </select>

            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm font-medium text-sm"
            >
              <Download size={16} />
              导入作品
            </button>
            <Link
              to="/create"
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-sm font-medium text-sm"
            >
              <Plus size={16} />
              新建作品
            </Link>
        </div>
      </div>

      <ImportModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)}
        onSuccess={loadProjects}
      />

      {loading ? (
        <div className="text-center py-20 text-gray-400">
            <div className="animate-pulse">加载中...</div>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="mx-auto w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 mb-4">
            <BookOpen size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">还没有作品</h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            开始您的第一部小说创作之旅吧，或者导入已有的作品继续续写。
          </p>
          <div className="flex justify-center gap-4">
              <button
                onClick={() => setIsImportOpen(true)}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
              >
                导入作品
              </button>
              <Link
                to="/create"
                className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm"
              >
                开始创作
              </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              className="group block bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6 border border-gray-100 hover:border-purple-200 relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                    <span className="inline-block px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-md">
                    {project.settings?.novelType || '未分类'}
                    </span>
                    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-md ${
                        project.status === 'running' ? 'bg-green-50 text-green-700' : 
                        project.status === 'completed' ? 'bg-blue-50 text-blue-700' : 
                        'bg-gray-50 text-gray-600'
                    }`}>
                    {project.status === 'running' ? '创作中' : 
                    project.status === 'completed' ? '已完结' : '草稿'}
                    </span>
                </div>
                
                {/* Delete Button */}
                <button
                    onClick={(e) => handleDelete(e, project.id, project.name)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="删除作品"
                >
                    <Trash2 size={16} />
                </button>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                  {project.name}
              </h3>
              <p className="text-gray-500 text-sm line-clamp-2 mb-6 h-10 leading-relaxed">
                {project.description || '暂无简介'}
              </p>
              <div className="flex justify-between items-center text-xs text-gray-400 pt-4 border-t border-gray-50">
                <span className="flex items-center gap-1">
                    <BookOpen size={14} />
                    {project.total_chapters_count || 0}/{project.target_chapters} 章
                </span>
                <span className="flex items-center gap-1">
                    <AlignLeft size={14} />
                    {(project.total_word_count || 0).toLocaleString()} 字
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
