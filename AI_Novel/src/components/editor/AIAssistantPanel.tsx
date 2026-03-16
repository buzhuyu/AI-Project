import { Sparkles, PenTool, Loader2, RotateCcw } from 'lucide-react';

interface AIAssistantPanelProps {
    instruction: string;
    setInstruction: (value: string) => void;
    handleContinue: () => void;
    handleRewrite?: () => void;
    isProcessing: boolean;
    isStreaming: boolean;
}

export default function AIAssistantPanel({
    instruction,
    setInstruction,
    handleContinue,
    handleRewrite,
    isProcessing,
    isStreaming
}: AIAssistantPanelProps) {
    if (isStreaming) {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-purple-600 gap-3">
                <Loader2 size={24} className="animate-spin" />
                <p className="text-sm font-medium">AI 正在奋笔疾书中...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">写作指令</label>
                <textarea
                    id="instruction-input"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="输入具体要求，如：这里加一段环境描写，或者让主角遇到意外..."
                    className="w-full h-24 border border-purple-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all resize-none bg-purple-50/30"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleContinue();
                        }
                    }}
                />
            </div>
            
            <div className="flex flex-col gap-2">
                <button
                    onClick={handleContinue}
                    disabled={isProcessing}
                    className="w-full py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-2"
                >
                    {isProcessing ? <Loader2 size={16} className="animate-spin"/> : (
                        instruction ? <><Sparkles size={16}/> 指令续写</> : <><PenTool size={16}/> 接着写</>
                    )}
                </button>
                
                {handleRewrite && (
                    <button
                        onClick={handleRewrite}
                        disabled={isProcessing}
                        className="w-full py-2.5 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 disabled:opacity-50 text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={16}/> 重新生成本章
                    </button>
                )}
            </div>

            <p className="text-[10px] text-gray-400 leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                💡 提示：<br/>
                - <b>接着写</b>：光标在哪里，AI 就从哪里续写。<br/>
                - <b>重写</b>：清空当前章节，根据指令重新生成全文。
            </p>
        </div>
    );
}
