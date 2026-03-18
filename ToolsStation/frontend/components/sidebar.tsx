'use client';

import { 
  LayoutDashboard, 
  Github, 
  FileText, 
  Zap, 
  Settings, 
  Menu,
  Terminal,
  Activity,
  Code,
  Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

interface SidebarProps {
  className?: string;
  selectedSource: string;
  onSelectSource: (source: string) => void;
}

export function Sidebar({ className, selectedSource, onSelectSource }: SidebarProps) {
  const links = [
    { name: '聚合动态', icon: LayoutDashboard, id: 'all' },
    { name: '综合推荐', icon: Activity, id: 'recommended' },
    { name: 'GITHUB 热门', icon: Github, id: 'GitHub Trending' },
    { name: 'HF 论文', icon: FileText, id: 'Hugging Face Daily Papers' },
    { name: '掘金 AI', icon: Zap, id: 'Juejin AI' },
    { name: 'Reddit ML', icon: Terminal, id: 'Reddit ML' },
    { name: '量子位', icon: Code, id: 'QbitAI' },
  ];

  return (
    <div className={cn("pb-12 border-r border-primary/20 bg-black/50", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-6 px-4 text-xl font-bold tracking-widest text-primary font-orbitron glow-text flex items-center gap-2">
            <Terminal className="w-6 h-6" />
            AI.NEXUS
          </h2>
          <div className="space-y-1">
            {links.map((link) => (
              <Button
                key={link.id}
                variant={selectedSource === link.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start font-mono tracking-wider",
                  selectedSource === link.id ? "bg-primary/20 text-primary border-l-2 border-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
                onClick={() => onSelectSource(link.id)}
              >
                <link.icon className="mr-2 h-4 w-4" />
                {link.name}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="px-3 py-2 mt-auto">
          <div className="bg-primary/5 border border-primary/20 rounded p-4 mx-2">
            <div className="text-xs text-primary/70 font-mono mb-2">系统状态</div>
            <div className="flex items-center gap-2 text-green-500 text-xs font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              在线
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileSidebar({ selectedSource, onSelectSource }: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="md:hidden text-primary">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 bg-background border-r border-primary/20">
        <Sidebar 
          selectedSource={selectedSource} 
          onSelectSource={(s) => {
            onSelectSource(s);
            setOpen(false);
          }} 
        />
      </SheetContent>
    </Sheet>
  );
}
