import * as Joi from 'joi';

export default Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  PROJECT_NAME: Joi.string().default('domestic-bff'),

  // ============================================
  // MongoDB (principal storage do BFF)
  // ============================================
  MONGO_URI: Joi.string().default('mongodb://localhost:27017/zolve-bff'),

  // ============================================
  // Redis (cache + WebSocket Pub/Sub)
  // ============================================
  CACHE_REDIS_HOST: Joi.string().default('localhost'),
  CACHE_REDIS_PORT: Joi.number().default(6379),
  CACHE_REDIS_PASSWORD: Joi.string().optional().allow(''),

  // ============================================
  // Backend API (chamada interna — não passa pelo Kong)
  // ============================================
  API_BASE_URL: Joi.string().default('http://localhost:3000'),
  API_TIMEOUT_MS: Joi.number().default(5000),

  // ============================================
  // WebSocket
  // ============================================
  WS_CORS_ORIGINS: Joi.string().default('http://localhost:4200,http://localhost:3000'),

  // ============================================
  // Cache TTLs (segundos)
  // ============================================
  CACHE_TTL_HOME: Joi.number().default(300),
  CACHE_TTL_SEARCH: Joi.number().default(120),
  CACHE_TTL_PROVIDER_PROFILE: Joi.number().default(180),
  CACHE_TTL_DASHBOARD: Joi.number().default(60),
});
