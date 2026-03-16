export function parseNovelContent(content: string) {
    const chapters: { chapter_number: number; title: string; content: string }[] = [];
    const lines = content.split('\n');
    let currentChapter: any = null;
    let chapterCount = 0;

    const chapterTitleRegex = /^\s*(第[0-9一二三四五六七八九十百千]+[章节回]\s*.*)$/;

    for (const line of lines) {
        const match = line.match(chapterTitleRegex);
        if (match) {
            if (currentChapter) {
                chapters.push(currentChapter);
            }
            chapterCount++;
            currentChapter = {
                chapter_number: chapterCount,
                title: match[1].trim(),
                content: match[1].trim() + '\n' // Include title in content for reference
            };
        } else {
            if (currentChapter) {
                currentChapter.content += line + '\n';
            } else {
                // Prologue or pre-chapter content? 
                // For now, ignore or create a chapter 0? Let's ignore for simplicity or append to first if needed.
                // Or maybe create a "序章" if content exists before first chapter.
                if (line.trim()) {
                    if (!currentChapter) {
                        currentChapter = {
                            chapter_number: 1, // Default to 1 if no header found initially
                            title: '序章/开篇',
                            content: ''
                        };
                        chapterCount = 1;
                    }
                    currentChapter.content += line + '\n';
                }
            }
        }
    }

    if (currentChapter) {
        chapters.push(currentChapter);
    }

    return chapters;
}