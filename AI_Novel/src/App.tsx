import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { BookOpen, PenTool, LayoutDashboard, Library, User, LogOut, Sparkles } from "lucide-react";
import Home from "@/pages/Home";
import CreateProject from "@/pages/CreateProject";
import Dashboard from "@/pages/Dashboard";
import ProjectDetail from "@/pages/ProjectDetail";
import ChapterEditor from "@/pages/ChapterEditor";
import Login from "@/pages/Login";

function ProtectedRoute({ children }: { children: JSX.Element }) {
    const user = localStorage.getItem('user');
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

function Layout() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login';
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (isAuthPage) {
      return (
          <Routes>
              <Route path="/login" element={<Login />} />
          </Routes>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="bg-purple-600 p-1.5 rounded-lg text-white shadow-sm group-hover:bg-purple-700 transition-colors">
                  <Sparkles size={20} />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  B-AI Novel
                </span>
              </Link>
              
              <div className="hidden md:flex items-center gap-1">
                <NavLink to="/dashboard" icon={<LayoutDashboard size={18} />} label="创作台" />
                <NavLink to="/library" icon={<Library size={18} />} label="作品库" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                    <User size={16} />
                    <span className="font-medium">{user.name || user.username}</span>
                  </div>
                  <button 
                    onClick={() => {
                        localStorage.removeItem('user');
                        window.location.href = '/login';
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="退出登录"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <Link 
                  to="/login" 
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
                >
                  登录
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreateProject /></ProtectedRoute>} />
          <Route path="/project/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
          <Route path="/project/:projectId/chapter/:chapterId" element={<ProtectedRoute><ChapterEditor /></ProtectedRoute>} />
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
              <h1 className="text-6xl font-bold mb-4">404</h1>
              <p className="text-xl">页面未找到</p>
              <Link to="/" className="mt-8 text-purple-600 hover:underline">返回首页</Link>
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive 
          ? 'text-purple-600 bg-purple-50' 
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export default function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}
