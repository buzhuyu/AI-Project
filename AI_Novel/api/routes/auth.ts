import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// Login / Register
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password required' });
        }

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (existingUser) {
            // Verify password
            if (existingUser.password === password) {
                res.json({ success: true, user: existingUser });
            } else {
                res.status(401).json({ success: false, error: 'Invalid password' });
            }
        } else {
            // Register new user
            const { data: newUser, error } = await supabase
                .from('users')
                .insert({
                    username,
                    password,
                    name: username, // Default name
                    email: `${username}@local.dev` // Fake email
                })
                .select()
                .single();
            
            if (error) throw error;
            res.json({ success: true, user: newUser, isNew: true });
        }
    } catch (error: any) {
        console.error('Auth error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;