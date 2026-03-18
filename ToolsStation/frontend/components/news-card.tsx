import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Star, ThumbsUp, GitFork, BookOpen, FileText, Cpu, Code, Zap, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NewsItem {
  title: string;
  url: string;
  description?: string;
  original_desc?: string;
  summary?: string;
  stars?: string;
  upvotes?: string;
  source: string;
  thumbnail?: string;
}

interface NewsCardProps {
  item: NewsItem;
  rank?: number;
}

export function NewsCard({ item, rank }: NewsCardProps) {
  // Determine icon and color based on source
  let SourceIcon = FileText;
  let borderColor = "border-slate-500/50";
  let glowClass = "";
  
  if (item.source.includes('GitHub')) {
    SourceIcon = Code;
    borderColor = "border-cyan-500/50";
    glowClass = "hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]";
  } else if (item.source.includes('Hugging Face')) {
    SourceIcon = Cpu;
    borderColor = "border-yellow-500/50";
    glowClass = "hover:shadow-[0_0_15px_rgba(234,179,8,0.3)]";
  } else if (item.source.includes('Juejin')) {
    SourceIcon = Zap;
    borderColor = "border-blue-500/50";
    glowClass = "hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]";
  } else if (item.source.includes('Reddit')) {
    SourceIcon = Terminal;
    borderColor = "border-orange-500/50";
    glowClass = "hover:shadow-[0_0_15px_rgba(249,115,22,0.3)]";
  } else if (item.source.includes('QbitAI')) {
    SourceIcon = Code;
    borderColor = "border-red-500/50";
    glowClass = "hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]";
  }

  // Logic to determine the best content to display
  // If summary exists and is not a mock/test summary, use it. Otherwise use original_desc.
  // Note: Backend now uses newspaper3k which might prefix "[自动提取]", which is valid.
  // The user specifically wants to avoid "[测试模式]" or simple mocks.
  const isMockSummary = !item.summary || item.summary.includes("测试模式") || item.summary.includes("未配置 LLM");
  const displayContent = isMockSummary ? (item.original_desc || "暂无描述") : item.summary;

  return (
    <Dialog>
      <Card className={cn(
        "bg-black/40 backdrop-blur-sm border transition-all cursor-pointer group h-full flex flex-col relative overflow-hidden",
        borderColor,
        glowClass
      )}>
        {/* Rank Badge for Recommended Tab */}
        {rank && (
          <div className="absolute top-0 right-0 bg-primary/20 text-primary px-3 py-1 rounded-bl-lg border-b border-l border-primary/30 font-mono text-xs font-bold z-10">
            #{rank}
          </div>
        )}

        {/* Decor lines */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <CardHeader className="p-4 pb-2 space-y-1 relative z-10">
          <div className="flex justify-between items-start gap-2">
            <Badge variant="outline" className="w-fit mb-2 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-primary/30 bg-primary/5">
               <SourceIcon className="w-3 h-3" /> {item.source}
            </Badge>
          </div>
          <DialogTrigger asChild>
            <CardTitle className="text-sm md:text-base font-bold leading-tight group-hover:text-primary transition-colors font-mono line-clamp-2">
              {item.title}
            </CardTitle>
          </DialogTrigger>
        </CardHeader>
        
        <CardContent className="p-4 pt-0 flex-1 relative z-10">
             <p className="text-xs text-muted-foreground line-clamp-3 mt-2 font-mono leading-relaxed border-l-2 border-primary/20 pl-2">
               {displayContent}
             </p>
        </CardContent>
        
        <CardFooter className="p-4 pt-2 border-t border-white/5 bg-white/5 flex justify-between items-center text-xs text-muted-foreground font-mono">
           <div className="flex gap-3">
             {item.stars && (
               <span className="flex items-center gap-1 text-cyan-400"><Star className="w-3 h-3" /> {item.stars}</span>
             )}
             {item.upvotes && (
               <span className="flex items-center gap-1 text-yellow-400"><ThumbsUp className="w-3 h-3" /> {item.upvotes}</span>
             )}
           </div>
           <DialogTrigger asChild>
             <Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase tracking-widest hover:text-primary">
               [查看详情]
             </Button>
           </DialogTrigger>
        </CardFooter>
      </Card>

      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-black/90 border-primary/30 text-foreground font-mono">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
             <Badge variant="outline" className="border-primary/50 text-primary">{item.source}</Badge>
          </div>
          <DialogTitle className="text-xl leading-snug font-orbitron text-primary glow-text">{item.title}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4 mt-4">
          <div className="space-y-4">
            {item.thumbnail && (
              <div className="relative rounded-md overflow-hidden border border-primary/20">
                <img src={item.thumbnail} alt="Thumbnail" className="w-full h-48 object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              </div>
            )}
            
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1 opacity-20">
                <Cpu className="w-12 h-12" />
              </div>
              <h4 className="font-bold mb-2 flex items-center gap-2 text-primary">
                // 核心内容
              </h4>
              <p className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap">
                {displayContent}
              </p>
            </div>
          </div>
        </ScrollArea>
        
        <div className="pt-4 border-t border-primary/20 mt-4 flex justify-end">
          <Button asChild className="bg-primary hover:bg-primary/80 text-black font-bold">
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              访问源链接 <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
