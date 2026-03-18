'use client';

'use client';

import { useEffect, useState } from 'react';
import { Sidebar, MobileSidebar } from '@/components/sidebar';
import { NewsCard, NewsItem } from '@/components/news-card';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Zap, Layers, Rocket, Cpu } from 'lucide-react';

export default function Home() {
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState('all');
  // For recommended tab
  const [recommendTab, setRecommendTab] = useState('technology');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Use window.location.hostname to dynamically determine the API host
      // If running on localhost, use localhost. If on LAN IP (e.g. 192.168.x.x), use that IP.
      // This assumes backend runs on the SAME machine as frontend dev server, on port 8000.
      // For production, this should be an environment variable.
      const apiHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
      const apiUrl = `http://${apiHost}:8000/api/v1/news?limit=300`;
      
      const res = await fetch(apiUrl);
      const json = await res.json();
      if (json.status === 'success') {
        setAllNews(json.data as NewsItem[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const apiHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
      await fetch(`http://${apiHost}:8000/api/v1/trigger-update`, { method: 'POST' });
      setTimeout(() => fetchData(), 4000);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  // Logic for Recommended Tab with Categories
  const getRecommendedNews = (category: string) => {
    // 1. Filter by category keywords (since backend category might not be fully populated in old items, we do simple client-side check too)
    // Actually backend `determine_category` logic is: 
    // Product: launch, release, product, app...
    // Technology: paper, code, model, repo...
    // Other: rest
    
    // We can reuse similar logic here or trust backend if we exposed it. 
    // Since we didn't expose `category` field in API explicitly (it's in `data` but typed as NewsItem interface?),
    // Let's check if NewsItem interface has it. We need to add it to interface.
    // Or we can just do simple filtering here.
    
    const filterFn = (item: NewsItem) => {
        const text = (item.title + " " + (item.original_desc || "")).toLowerCase();
        
        if (category === 'technology') {
            return item.source.includes('GitHub') || item.source.includes('Hugging Face') || 
                   text.includes('paper') || text.includes('code') || text.includes('model') || 
                   text.includes('algorithm') || text.includes('论文') || text.includes('模型');
        }
        if (category === 'product') {
            return text.includes('launch') || text.includes('release') || text.includes('product') || 
                   text.includes('app') || text.includes('tool') || text.includes('发布') || 
                   text.includes('应用') || text.includes('上线') || item.source.includes('Product Hunt');
        }
        return true; // Other
    };
    
    const filtered = allNews.filter(filterFn);
    
    // Sort by some score? For now just return top 10
    return filtered.slice(0, 10);
  };

  const getDisplayNews = () => {
    if (selectedSource === 'recommended') {
      return getRecommendedNews(recommendTab);
    }
    if (selectedSource === 'all') {
      return allNews;
    }
    return allNews.filter(item => item.source === selectedSource);
  };

  const displayNews = getDisplayNews();

  return (
    <div className="flex h-screen overflow-hidden bg-[url('/grid-bg.png')] bg-fixed bg-cover">
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-background/95 -z-10 pointer-events-none" />
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 flex-col z-20">
        <Sidebar 
          selectedSource={selectedSource} 
          onSelectSource={setSelectedSource} 
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-black/50 backdrop-blur supports-[backdrop-filter]:bg-black/20">
          <div className="flex items-center gap-4">
            <MobileSidebar 
              selectedSource={selectedSource} 
              onSelectSource={setSelectedSource} 
            />
            <h1 className="text-xl font-bold md:text-2xl font-orbitron text-primary glow-text tracking-wider uppercase">
              {selectedSource === 'all' ? '聚合动态' : 
               selectedSource === 'recommended' ? '综合推荐' : 
               selectedSource === 'GitHub Trending' ? 'GITHUB 热门' :
               selectedSource === 'Hugging Face Daily Papers' ? 'Hugging Face 论文' :
               selectedSource === 'Juejin AI' ? '掘金 AI' :
               selectedSource === 'Reddit ML' ? 'REDDIT 社区' :
               selectedSource === 'QbitAI' ? '量子位 AI' : selectedSource}
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleUpdate} disabled={loading} className="border-primary/50 text-primary hover:bg-primary hover:text-black font-mono">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '同步中...' : '同步数据'}
          </Button>
        </header>

        {/* Feed Stream */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            
            {/* Recommended Tabs */}
            {selectedSource === 'recommended' && (
              <div className="mb-6">
                 <div className="flex items-center gap-2 text-primary/80 font-mono text-sm border-b border-primary/20 pb-4 mb-4">
                    <Zap className="w-4 h-4" />
                    <span>智能助理推荐 // TOP_PRIORITY_DATA</span>
                 </div>
                 
                 <Tabs defaultValue="technology" value={recommendTab} onValueChange={setRecommendTab} className="w-full">
                    <TabsList className="bg-primary/10 border border-primary/20">
                      <TabsTrigger value="technology" className="data-[state=active]:bg-primary data-[state=active]:text-black font-mono">
                        <Cpu className="w-4 h-4 mr-2"/> 技术硬核
                      </TabsTrigger>
                      <TabsTrigger value="product" className="data-[state=active]:bg-primary data-[state=active]:text-black font-mono">
                        <Rocket className="w-4 h-4 mr-2"/> 产品发布
                      </TabsTrigger>
                      <TabsTrigger value="other" className="data-[state=active]:bg-primary data-[state=active]:text-black font-mono">
                        <Layers className="w-4 h-4 mr-2"/> 综合动态
                      </TabsTrigger>
                    </TabsList>
                 </Tabs>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
              {displayNews.map((item, index) => (
                <NewsCard 
                  key={index} 
                  item={item} 
                  rank={selectedSource === 'recommended' ? index + 1 : undefined}
                />
              ))}
            </div>
            
            {displayNews.length === 0 && !loading && (
              <div className="text-center py-20 text-muted-foreground font-mono">
                [未检测到数据] // 请尝试刷新或切换分类
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
