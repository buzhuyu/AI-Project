import { Link } from "react-router-dom";
import { PenTool, CheckCircle2, Clapperboard, BookOpen, ArrowRight, Github } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute top-20 right-20 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
      </div>
      
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-2">
              <div className="bg-purple-600 text-white p-1.5 rounded-lg">
                <PenTool size={20} />
              </div>
              <span className="text-xl font-bold text-gray-900">B-AI Novel</span>
            </div>
            <div className="flex gap-4">
              <Link to="/login" className="text-gray-500 hover:text-gray-900 font-medium">登录</Link>
              <Link to="/login" className="text-purple-600 hover:text-purple-700 font-medium">注册</Link>
            </div>
          </div>

          <div className="text-center max-w-3xl mx-auto mb-20">
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight">
              AI 驱动的<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">下一代小说创作平台</span>
            </h1>
            <p className="text-xl text-gray-500 mb-10 leading-relaxed">
              B-AI Novel 不仅仅是一个编辑器，它是您的全天候创作伙伴。
              <br className="hidden md:block"/>
              从世界观构建到章节润色，让灵感无限流淌。
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-medium rounded-xl text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-lg hover:shadow-purple-500/25 transform hover:-translate-y-0.5"
            >
              <PenTool className="w-5 h-5" />
              开始创作
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-medium rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
            >
              <Github className="w-5 h-5" />
              了解更多
            </a>
          </div>
          
          <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <FeatureCard 
              icon={<PenTool className="w-8 h-8 text-purple-600" />}
              title="智能写手"
              desc="自动生成章节"
            />
            <FeatureCard 
              icon={<CheckCircle2 className="w-8 h-8 text-indigo-600" />}
              title="精准校对"
              desc="纠正语法错误"
            />
            <FeatureCard 
              icon={<Clapperboard className="w-8 h-8 text-pink-600" />}
              title="剧情编辑"
              desc="把控故事走向"
            />
            <FeatureCard 
              icon={<BookOpen className="w-8 h-8 text-blue-600" />}
              title="模拟读者"
              desc="反馈阅读体验"
            />
          </div>
        </div>
      </div>
      
      <footer className="bg-white border-t border-gray-100 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-gray-900 text-white p-1 rounded">
              <PenTool size={16} />
            </div>
            <span className="font-bold text-gray-900">B-AI Novel</span>
          </div>
          <div className="text-gray-400 text-sm">
            © 2024 B-AI Novel. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
      <div className="mb-4 flex justify-center transform group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <div className="font-bold text-slate-900 mb-1">{title}</div>
      <div className="text-sm text-slate-500">{desc}</div>
    </div>
  );
}
