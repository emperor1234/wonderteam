import express from 'express';
import cookieParser from 'cookie-parser';
import apiRouter from '../server/routes.ts';

const app = express();

// Security headers. No CORS headers are emitted on purpose: the SPA and the API
// share an origin, and a wildcard origin would be incompatible with the
// credentialed, SameSite=Strict session cookie.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Health check endpoints
app.get(['/', '/api', '/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    url: req.url,
    originalUrl: req.originalUrl,
  });
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

export default function handler(req: any, res: any) {
  return app(req, res);
}

export { app };
