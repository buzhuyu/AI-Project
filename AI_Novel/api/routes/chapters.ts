import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { workflowManager } from '../lib/workflow.js';

const router = Router();

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('chapters')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update chapter content
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { content, title } = req.body;
        
        const updateData: any = { 
            content, 
            word_count: content.length 
        };

        if (title !== undefined) {
            updateData.title = title;
        }

        const { data, error } = await supabase
            .from('chapters')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Confirm chapter
router.post('/:id/confirm', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        // Trigger the workflow asynchronously
        // We don't await this because it involves multiple agent steps
        workflowManager.handleChapterConfirmation(id).catch(err => console.error('Workflow error:', err));

        // Immediately return success so UI updates
        // UI should show "Processing..." or similar based on status change
        // But status change happens in handleChapterConfirmation.
        // Let's set status to 'processing' or 'proofreading' immediately?
        // handleChapterConfirmation does it.
        
        // We return "success" but note that next chapter hasn't started yet.
        // The UI needs to poll or listen for updates.
        
        res.json({ success: true, message: 'Workflow started' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Manual proofread
router.post('/:id/proofread', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await workflowManager.manualProofread(id);
        res.json({ success: true, result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get reviews
router.get('/:id/reviews', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('chapter_id', id)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
