import express from 'express';
import apiRouter from '../server/routes.ts';

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Middleware to normalize rewritten paths from Vercel
app.use((req, _res, next) => {
  // If Vercel rewrote the URL, it provides x-matched-path or originalUrl
  const matchedPath = req.headers['x-matched-path'];
  if (typeof matchedPath === 'string' && matchedPath.startsWith('/api')) {
    req.url = matchedPath.replace(/^\/api/, '') || '/';
  } else if (req.url.startsWith('/api')) {
    req.url = req.url.replace(/^\/api/, '') || '/';
  }
  next();
});

// Mount the API router
app.use(apiRouter);

// Fallback 404 handler for API routes
app.use((req, res) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.method} ${req.originalUrl || req.url}`,
  });
});

// Global error handler - always returns JSON
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: err?.message || 'Internal server error occurred',
  });
});

export default app;
