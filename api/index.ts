import express from 'express';
import apiRouter from '../server/routes.ts';

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Health check endpoints
app.get(['/health', '/api/health'], (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Path normalizer: ensures both /api/... and /... hit apiRouter
app.use((req, _res, next) => {
  const matchedPath = req.headers['x-matched-path'];
  if (typeof matchedPath === 'string' && matchedPath.startsWith('/api')) {
    req.url = matchedPath.replace(/^\/api/, '') || '/';
  }
  next();
});

// Mount router on both /api and root so all path formats resolve
app.use('/api', apiRouter);
app.use(apiRouter);

// Fallback JSON 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.method} ${req.originalUrl || req.url}`,
  });
});

// Global error handler - always returns JSON with 500 status
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: err?.message || 'Internal server error occurred',
  });
});

export default app;
