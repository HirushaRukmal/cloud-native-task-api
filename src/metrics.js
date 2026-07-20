const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'task_api_' });

const httpRequestsTotal = new client.Counter({
  name: 'task_api_http_requests_total',
  help: 'Total number of HTTP requests processed.',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'task_api_http_request_duration_seconds',
  help: 'HTTP request duration in seconds.',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

const activeRequests = new client.Gauge({
  name: 'task_api_http_active_requests',
  help: 'Number of HTTP requests currently being processed.',
  registers: [register],
});

function normaliseRoute(req) {
  if (req.route?.path) {
    return `${req.baseUrl || ''}${req.route.path}`;
  }
  return req.path === '/metrics' ? '/metrics' : 'unmatched';
}

function metricsMiddleware(req, res, next) {
  const startedAt = process.hrtime.bigint();
  activeRequests.inc();

  res.on('finish', () => {
    const elapsedSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
    const labels = {
      method: req.method,
      route: normaliseRoute(req),
      status_code: String(res.statusCode),
    };

    activeRequests.dec();
    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, elapsedSeconds);
  });

  next();
}

module.exports = {
  register,
  metricsMiddleware,
};
