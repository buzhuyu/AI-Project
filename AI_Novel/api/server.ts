/**
 * local server entry file, for local development
 */
import app from './app.js';
import { writerAgent } from './agents/writer.js';
import { workflowManager } from './lib/workflow.js';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, async () => {
  console.log(`Server ready on port ${PORT}`);
  
  // Start Recovery Process
  console.log('Starting background task recovery...');
  try {
      await writerAgent.recover();
      await workflowManager.recover();
      console.log('Recovery check complete.');
  } catch (err) {
      console.error('Recovery failed:', err);
  }
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
