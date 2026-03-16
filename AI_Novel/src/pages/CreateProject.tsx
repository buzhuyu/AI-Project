import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { ArrowLeft, Book, Type, FileText, Target, Sparkles, Loader2 } from 'lucide-react';

export default function CreateProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    novelType: '玄幻',
    targetWords: 100000,
    wordsPerChapter: 3000,
    aiWriteCount: 0, // 0 means no limit (write all)
    background: '',
    powerSystem: '',
    characterInfo: '',
    plotOutline: '',
    characters: [] as any[], // Simplified for now
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Ensure numeric fields are parsed
    const finalValue = (name === 'targetWords' || name === 'wordsPerChapter' || name === 'aiWriteCount') ? (parseInt(value) || 0) : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) throw new Error('User not logged in');
      const user = JSON.parse(userStr);

      // Calculate chapter count
      const calculatedChapterCount = Math.ceil(formData.targetWords / (formData.wordsPerChapter || 1)) || 1;
      
      // Determine final AI write count (if 0, let it be null or equal to total chapters)
      const finalAiWriteCount = formData.aiWriteCount > 0 ? formData.aiWriteCount : calculatedChapterCount;

      await api.createProject({
        ...formData,
        chapterCount: calculatedChapterCount,
        aiWriteCount: finalAiWriteCount,
        userId: user.id,
        background: { description: formData.background },
        characters: [], 
      });
      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      alert('Failed to create project: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Calculate for display
  const displayChapterCount = Math.ceil(formData.targetWords / (formData.wordsPerChapter || 1)) || 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/dashboard" className="inline-flex items-center text-sm text-slate-500 hover:text-purple-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" />
        返回创作台
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
          <Book size={24} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">创建新作品</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 基本信息 */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2 pb-4 border-b border-slate-50">
            <Type size={18} className="text-purple-500" />
            基本信息
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">作品名称</label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                placeholder="给你的大作起个名字"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">小说类型</label>
              <div className="relative">
                <select
                  name="novelType"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all appearance-none"
                  value={formData.novelType}
                  onChange={handleChange}
                >
                  <option value="玄幻">玄幻</option>
                  <option value="都市">都市</option>
                  <option value="言情">言情</option>
                  <option value="科幻">科幻</option>
                  <option value="悬疑">悬疑</option>
                  <option value="历史">历史</option>
                  <option value="奇幻">奇幻</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">作品简介</label>
              <textarea
                name="description"
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all resize-none"
                placeholder="一句话介绍你的故事..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* 篇幅规划 */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2 pb-4 border-b border-slate-50">
            <Target size={18} className="text-indigo-500" />
            篇幅规划
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">目标字数</label>
              <div className="relative">
                <input
                  type="number"
                  name="targetWords"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                  value={formData.targetWords}
                  onChange={handleChange}
                />
                <span className="absolute right-4 top-2.5 text-slate-400 text-sm">字</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">每章字数</label>
              <div className="relative">
                <input
                  type="number"
                  name="wordsPerChapter"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                  value={formData.wordsPerChapter}
                  onChange={handleChange}
                />
                <span className="absolute right-4 top-2.5 text-slate-400 text-sm">字</span>
              </div>
            </div>
            
            {/* 新增：AI 试写限制 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">AI 试写章节数（可选）</label>
              <div className="relative">
                <input
                  type="number"
                  name="aiWriteCount"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                  placeholder="例如：3（表示AI只写前3章就暂停）"
                  value={formData.aiWriteCount || ''}
                  onChange={handleChange}
                />
                <span className="absolute right-4 top-2.5 text-slate-400 text-sm">章</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 ml-1">如果不填或填 0，AI 将默认写完全文。</p>
            </div>

            {/* 自动计算结果展示区域 */}
            <div className="md:col-span-2">
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 flex items-center gap-3 text-slate-600">
                <Target size={18} className="text-purple-500" />
                <span className="text-sm">
                  预计总章节：<span className="font-bold text-purple-600 text-base">{displayChapterCount}</span> 章
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 初始设定 */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2 pb-4 border-b border-slate-50">
            <Sparkles size={18} className="text-amber-500" />
            初始设定
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">世界观与背景</label>
              <textarea
                name="background"
                rows={4}
                placeholder="请描述故事发生的时代背景、地理环境、社会形态、政治格局等..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                value={formData.background}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">力量体系与等级</label>
              <textarea
                name="powerSystem"
                rows={3}
                placeholder="请描述核心力量体系（如修仙、魔法、异能）、等级划分标准、升级规则等..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                value={formData.powerSystem}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">主要角色设定</label>
              <textarea
                name="characterInfo"
                rows={3}
                placeholder="请简述主角（姓名/性格/金手指）及核心配角的人设..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                value={formData.characterInfo}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">剧情走向与开篇</label>
              <textarea
                name="plotOutline"
                rows={3}
                placeholder="请描述故事的开篇情节、主线目标、核心冲突或预期的高潮点..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                value={formData.plotOutline}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end items-center gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                开始创作
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
