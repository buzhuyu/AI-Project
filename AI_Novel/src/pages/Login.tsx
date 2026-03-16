import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Sparkles, User, Lock, ArrowRight } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.login(username, password);
            if (res.success) {
                localStorage.setItem('user', JSON.stringify(res.user));
                if (res.isNew) {
                    alert('账号已自动注册并登录！');
                }
                navigate('/dashboard');
            } else {
                alert(res.error || '登录失败');
            }
        } catch (error) {
            console.error(error);
            alert('网络错误');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
             {/* Background decoration */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-3xl mix-blend-multiply"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-200/40 rounded-full blur-3xl mix-blend-multiply"></div>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl w-full max-w-md relative z-10 border border-slate-100">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 text-purple-600 mb-4">
                        <Sparkles size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">欢迎回来</h1>
                    <p className="text-slate-500 mt-2 text-sm">B-AI Novel - 智能创作助手</p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                        <div className="group">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">用户名</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-500 transition-colors">
                                    <User size={18} />
                                </div>
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                                    placeholder="请输入用户名"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="group">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">密码</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-500 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                                    placeholder="请输入密码"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="text-xs text-slate-400 text-center bg-slate-50 py-2 rounded-lg border border-slate-100">
                        提示：新用户输入任意账号密码即可自动注册
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-purple-600 text-white py-2.5 rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                    >
                        {loading ? '登录中...' : '立即登录'}
                        {!loading && <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />}
                    </button>
                </form>
            </div>
        </div>
    );
}
