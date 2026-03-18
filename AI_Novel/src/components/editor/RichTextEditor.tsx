'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { Markdown } from 'tiptap-markdown';
import { useEffect } from 'react';
import { Bold, Italic, List, Heading1, Heading2, Sparkles, Wand2 } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { marked } from 'marked';

interface RichTextEditorProps {
    content: string; // Expects Markdown
    onChange: (markdown: string) => void; // Emits Markdown
    isStreaming?: boolean;
    streamContent?: string; // Expects Markdown
    placeholder?: string;
    className?: string;
    onAIAction?: (action: string, selectedText: string) => void;
}

export default function RichTextEditor({ 
    content, 
    onChange, 
    isStreaming, 
    streamContent, 
    placeholder = '开始创作...',
    className,
    onAIAction
}: RichTextEditorProps) {
    
    const editor = useEditor({
        extensions: [
            StarterKit,
            Typography,
            Placeholder.configure({
                placeholder,
            }),
            Markdown, // Enable Markdown support
        ],
        content: '', // Initial empty, will set via useEffect
        editorProps: {
            attributes: {
                class: 'prose prose-lg max-w-none focus:outline-none min-h-[600px] p-8 outline-none font-serif',
            },
        },
        onUpdate: ({ editor }) => {
            if (!isStreaming) {
                // Get Markdown content
                const storage = (editor.storage as any).markdown;
                if (storage && typeof storage.getMarkdown === 'function') {
                    onChange(storage.getMarkdown());
                } else {
                    onChange(editor.getText());
                }
            }
        },
    });

    // Handle External Content Updates (Initial Load)
    useEffect(() => {
        if (editor && content && !isStreaming) {
            // Check if current editor content matches passed content (to avoid loop)
            let currentMarkdown = '';
            const storage = (editor.storage as any).markdown;
            if (storage && typeof storage.getMarkdown === 'function') {
                currentMarkdown = storage.getMarkdown();
            }

            // Simple check to prevent loop: if almost same, skip
            if (currentMarkdown !== content) {
                 // Better: use setContent with markdown if supported or just HTML
                 editor.commands.setContent(content);
            }
        }
    }, [content, editor, isStreaming]);

    // Handle Streaming Content
    useEffect(() => {
        if (editor && isStreaming && streamContent) {
            // Update only if content grew
            editor.commands.setContent(streamContent);
            
            // Scroll to bottom
            const { size } = editor.state.doc.content;
            editor.commands.setTextSelection(size);
            editor.commands.scrollIntoView();
        }
    }, [streamContent, isStreaming, editor]);

    if (!editor) {
        return null;
    }

    const getSelectedText = () => {
        const { from, to } = editor.state.selection;
        return editor.state.doc.textBetween(from, to, ' ');
    };

    return (
        <div className={twMerge("relative border border-gray-100 rounded-xl bg-white shadow-sm transition-all focus-within:ring-2 focus-within:ring-purple-100", className)}>
            
            {/* Bubble Menu for Selected Text */}
            {/* 
            {editor && (
                <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex bg-white shadow-xl border border-gray-100 rounded-lg overflow-hidden p-1 gap-1 items-center">
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={clsx("p-1.5 rounded hover:bg-gray-100 transition-colors", editor.isActive('bold') ? 'bg-purple-50 text-purple-600' : 'text-gray-600')}
                        title="加粗"
                    >
                        <Bold size={16} />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={clsx("p-1.5 rounded hover:bg-gray-100 transition-colors", editor.isActive('italic') ? 'bg-purple-50 text-purple-600' : 'text-gray-600')}
                        title="斜体"
                    >
                        <Italic size={16} />
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1" />
                    <button
                        onClick={() => onAIAction?.('polish', getSelectedText())}
                        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-purple-50 text-purple-600 transition-colors text-xs font-medium"
                    >
                        <Sparkles size={14} /> 润色
                    </button>
                    <button
                        onClick={() => onAIAction?.('expand', getSelectedText())}
                        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 text-blue-600 transition-colors text-xs font-medium"
                    >
                        <Wand2 size={14} /> 扩写
                    </button>
                </BubbleMenu>
            )}
            */}

            {/* Floating Menu for Empty Lines */}
            {/*
            {editor && (
                <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex bg-white shadow-lg border border-gray-100 rounded-lg overflow-hidden p-1 gap-1 items-center">
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={clsx("px-2 py-1 rounded hover:bg-gray-100 transition-colors text-xs font-bold", editor.isActive('heading', { level: 1 }) ? 'text-purple-600 bg-purple-50' : 'text-gray-500')}
                    >
                        H1
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={clsx("px-2 py-1 rounded hover:bg-gray-100 transition-colors text-xs font-bold", editor.isActive('heading', { level: 2 }) ? 'text-purple-600 bg-purple-50' : 'text-gray-500')}
                    >
                        H2
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={clsx("p-1.5 rounded hover:bg-gray-100 transition-colors", editor.isActive('bulletList') ? 'text-purple-600 bg-purple-50' : 'text-gray-500')}
                    >
                        <List size={16} />
                    </button>
                </FloatingMenu>
            )}
            */}

            <EditorContent editor={editor} />
        </div>
    );
}
