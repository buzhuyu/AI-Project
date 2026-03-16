import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
    Cpu, PenTool, Save, Key, Globe, 
    Bot, FileText, Loader2, Edit3, AlignLeft
} from 'lucide-react';

interface SettingsPanelProps {
    projectId: string;
    initialSettings: any;
    onUpdate: () => void;
}

type SectionType = 'basic' | 'model' | 'style' | 'all';

export default function SettingsPanel({ projectId, initialSettings, onUpdate }: SettingsPanelProps) {
    const [basicInfo, setBasicInfo] = useState({
        name: '',
        description: ''
    });
    
    const [config, setConfig] = useState({
        provider: 'deepseek',
        apiKey: '',
        baseUrl: 'https://api.deepseek.com',
        writerModel: 'deepseek-chat',
        editorModel: 'deepseek-chat',
        styleSample: ''
    });
    const [saving, setSaving] = useState(false);

    // Only set initial state once on mount or when id changes
    // We do NOT include initialSettings in dependency array to avoid overwriting user edits 
    // when parent polls for updates (every 3s)
    useEffect(() => {
        if (initialSettings) {
            setBasicInfo({
                name: initialSettings.name || '',
                description: initialSettings.description || ''
            });
            setConfig(prev => ({
                ...prev,
                ...initialSettings.modelConfig,
                styleSample: initialSettings.styleSample || ''
            }));
        }
    }, [projectId]);


    const handleSave = async (section: SectionType = 'all') => {
        setSaving(true);
        try {
            const updates: any = {};
            
            // Only add fields based on section
            if (section === 'basic' || section === 'all') {
                updates.name = basicInfo.name;
                updates.description = basicInfo.description;
            }
            
            if (section === 'model' || section === 'all') {
                updates.settings = {
                    ...(updates.settings || {}),
                    modelConfig: {
                        provider: config.provider,
                        apiKey: config.apiKey,
                        baseUrl: config.baseUrl,
                        writerModel: config.writerModel,
                        editorModel: config.editorModel
                    }
                };
            }
            
            if (section === 'style' || section === 'all') {
                updates.settings = {
                    ...(updates.settings || {}),
                    styleSample: config.styleSample
                }
            }

            const res = await api.updateProjectSettings(projectId, updates);
            
            if (res.success) {
                const labels: Record<SectionType, string> = {
                    basic: '基本信息',
                    model: '模型配置',
                    style: '风格参考',
                    all: '全部设置'
                };
                alert(`${labels[section]}保存成功`);
                onUpdate();
            } else {
                alert('保存失败: ' + res.error);
            }
        } catch (e) {
            console.error(e);
            alert('保存出错');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            {/* Basic Info */}
            <div>
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Edit3 size={20} className="text-purple-600"/>
                            基本信息
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">修改作品名称和简介</p>
                    </div>
                    <button 
                        onClick={() => handleSave('basic')}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium transition-all shadow-sm hover:shadow-md"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                        保存基本信息
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">作品名称</label>
                        <input 
                            type="text"
                            value={basicInfo.name}
                            onChange={e => setBasicInfo({...basicInfo, name: e.target.value})}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all font-medium"
                            placeholder="请输入作品名称"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                            <AlignLeft size={14}/> 简介
                        </label>
                        <textarea 
                            value={basicInfo.description}
                            onChange={e => setBasicInfo({...basicInfo, description: e.target.value})}
                            className="w-full h-24 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all resize-none"
                            placeholder="请输入作品简介..."
                        />
                    </div>
                </div>
            </div>

            <hr className="border-gray-100"/>

            {/* Model Configuration */}
            <div>
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Cpu size={20} className="text-purple-600"/>
                            模型配置
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">配置 AI 模型的连接参数与路由</p>
                    </div>
                    <button 
                        onClick={() => handleSave('model')}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium transition-all shadow-sm hover:shadow-md"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                        保存模型配置
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                            <Bot size={14}/> AI 提供商
                        </label>
                        <select 
                            value={config.provider}
                            onChange={e => setConfig({...config, provider: e.target.value})}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all"
                        >
                            <option value="deepseek">DeepSeek</option>
                            <option value="openai">OpenAI / Compatible</option>
                            <option value="anthropic">Anthropic (Claude)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                            <Globe size={14}/> API Base URL
                        </label>
                        <input 
                            type="text"
                            value={config.baseUrl}
                            onChange={e => setConfig({...config, baseUrl: e.target.value})}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all"
                            placeholder="https://api.deepseek.com"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                            <Key size={14}/> API Key (Project Specific)
                        </label>
                        <input 
                            type="password"
                            value={config.apiKey}
                            onChange={e => setConfig({...config, apiKey: e.target.value})}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all"
                            placeholder="sk-..."
                        />
                        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
                            留空则使用系统环境变量中的默认 Key
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">写作模型 (Writer Model)</label>
                        <input 
                            type="text"
                            value={config.writerModel}
                            onChange={e => setConfig({...config, writerModel: e.target.value})}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all"
                            placeholder="deepseek-chat"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">审校模型 (Editor Model)</label>
                        <input 
                            type="text"
                            value={config.editorModel}
                            onChange={e => setConfig({...config, editorModel: e.target.value})}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all"
                            placeholder="deepseek-chat"
                        />
                    </div>
                </div>
            </div>

            <hr className="border-gray-100"/>

            {/* 风格参考区域 */}
            <div>
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <PenTool size={20} className="text-purple-600"/>
                            风格参考
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            粘贴一段您希望 AI 模仿的文字样章（建议 500-2000 字），WriterAgent 会在创作时参考其用词习惯和句式节奏。
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={async () => {
                                const url = prompt('请输入文章链接（支持公众号、知乎、起点等公开文章）：');
                                if (!url) return;
                                try {
                                    setSaving(true);
                                    const res = await api.fetchArticleContent(url);
                                    if (res.success && res.content) {
                                        setConfig(prev => ({ ...prev, styleSample: res.content }));
                                        alert('提取成功！请记得点击保存。');
                                    } else {
                                        alert('提取失败：' + (res.error || '无法获取内容'));
                                    }
                                } catch (e) {
                                    console.error(e);
                                    alert('提取出错');
                                } finally {
                                    setSaving(false);
                                }
                            }}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium transition-all shadow-sm"
                        >
                            <Globe size={16}/> 联网提取
                        </button>
                        <button 
                            onClick={() => handleSave('style')}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium transition-all shadow-sm hover:shadow-md"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                            保存风格参考
                        </button>
                    </div>
                </div>
                
                <div className="relative">
                    <textarea 
                        value={config.styleSample}
                        onChange={e => setConfig({...config, styleSample: e.target.value})}
                        className="w-full h-48 border border-gray-200 rounded-lg p-4 font-serif text-sm leading-relaxed focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all resize-y"
                        placeholder="在此粘贴您的代表作片段..."
                    />
                    <div className="absolute top-4 right-4 text-gray-300 pointer-events-none">
                        <FileText size={20}/>
                    </div>
                </div>
            </div>

            {/* 底部全局保存按钮 */}
            <div className="flex justify-end pt-4 border-t border-gray-100">
                <button 
                    onClick={() => handleSave('all')}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium transition-all shadow-sm hover:shadow-md"
                >
                    {saving ? (
                        <>
                            <Loader2 size={18} className="animate-spin"/> 保存中...
                        </>
                    ) : (
                        <>
                            <Save size={18}/> 保存全部设置
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
