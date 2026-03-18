/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import projectRoutes from './routes/projects.js'
import chapterRoutes from './routes/chapters.js'
import aiRoutes from './routes/ai.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * Middleware to check user tier and limits
 */
const checkTierLimit = async (req: Request, res: Response, next: NextFunction) => {
    // Skip for non-generation endpoints or if no user context
    // Ideally this should verify JWT and fetch user from DB
    // For now, we mock the logic or trust a header
    
    const userId = req.headers['x-user-id'] || req.body.userId || req.query.userId;
    // If no userId found, assume it's a public/anon request which might be blocked or treated as 'free'
    
    // Allow pass for now, but inject tier info into req
    (req as any).userTier = 'free'; // Default
    
    // In real implementation:
    // const user = await supabase.from('users').select('tier, quota').eq('id', userId).single();
    // if (!user) return res.status(401).json({error: 'Unauthorized'});
    // (req as any).userTier = user.tier;
    
    next();
};

app.use(checkTierLimit);

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/chapters', chapterRoutes)
app.use('/api/ai', aiRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

// Serve static files from the React app build directory
// In local dev structure, dist is in project root, api is in api/
// So dist is at ../dist
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
            next();
        }
    });
});

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
