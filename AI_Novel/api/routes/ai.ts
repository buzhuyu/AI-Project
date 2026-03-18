import { Router, type Request, type Response } from 'express';
import { checkAIConnection } from '../lib/ai.js';
import { writerAgent } from '../agents/writer.js';

const router = Router();

router.get('/status', async (req: Request, res: Response) => {
  const result = await checkAIConnection();
  res.status(result.success ? 200 : 500).json(result);
});

// Fetch article content
router.post('/fetch-article', async (req: Request, res: Response) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        
        const html = await response.text();
        
        // Use regex to strip scripts/styles first
        let cleanHtml = html
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, "");
            
        // Simple text extraction (better than just stripping tags)
        // Find the main content if possible (common article tags)
        // For now, just strip all tags and condense whitespace
        let text = cleanHtml
            .replace(/<[^>]+>/g, "\n")
            .replace(/\n\s*\n/g, "\n")
            .trim();
            
        // Limit length to avoid token overflow
        // But keep enough for style analysis (e.g. 5000 chars)
        text = text.slice(0, 5000);
        
        res.json({ success: true, content: text });
    } catch (error: any) {
        console.error('Fetch article error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
