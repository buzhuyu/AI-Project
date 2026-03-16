import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { Upload, Loader2, FileText, X } from 'lucide-react';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            // Auto-set name from filename
            const fileNameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
            setName(fileNameWithoutExt);

            // Read preview
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                setPreview(text.slice(0, 500) + '...'); // Show first 500 chars
            };
            reader.readAsText(selectedFile);
        }
    };

    const handleImport = async () => {
        if (!file || !name) return;

        setLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const content = event.target?.result as string;

                const userStr = localStorage.getItem('user');
                if (!userStr) {
                    alert('请先登录');
                    setLoading(false);
                    return;
                }
                const user = JSON.parse(userStr);

                const res = await api.importProject(name, content, user.id);
            
            if (res.success) {
                onClose();
                onSuccess(); // Call onSuccess callback to refresh list
            } else {
                alert('导入失败: ' + res.error);
            }
                setLoading(false);
            };
            reader.readAsText(file);
        } catch (error) {
            console.error(error);
            setLoading(false);
            alert('导入出错');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                        <Upload size={20} className="text-purple-600"/>
                        导入已有作品
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">选择文件 (.txt)</label>
                        <div className="relative group">
                            <input 
                                type="file" 
                                accept=".txt"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2.5 file:px-4
                                    file:rounded-lg file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-purple-50 file:text-purple-700
                                    hover:file:bg-purple-100
                                    file:transition-colors cursor-pointer"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <FileText size={12} />
                            系统会自动识别“第X章”格式并进行拆分。
                        </p>
                    </div>

                    {file && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">作品名称</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all"
                            />
                        </div>
                    )}

                    {preview && (
                        <div className="bg-gray-50 p-4 rounded-lg text-xs text-gray-600 h-32 overflow-y-auto border border-gray-100 font-mono leading-relaxed">
                            {preview}
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg font-medium text-sm transition-colors"
                    >
                        取消
                    </button>
                    <button 
                        onClick={handleImport}
                        disabled={!file || !name || loading}
                        className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium text-sm transition-all shadow-sm"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> 导入中...
                            </>
                        ) : (
                            '开始导入'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
