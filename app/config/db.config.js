const DB_PASSWORD = process.env.DB_PASSWORD || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error("FATAL: DB_PASSWORD must be set in production.");
  }
  console.warn("WARNING: DB_PASSWORD is not set. Using default — set this in .env before going to production.");
  return "appUser1";
})();

module.exports = {
  HOST: process.env.DB_HOST || "localhost",
  PORT: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  USER: process.env.DB_USERNAME || process.env.DB_USER || "appUser",
  PASSWORD: DB_PASSWORD,
  DB: process.env.DB_DATABASE || process.env.DB_NAME || "JTK",
  dialect: "mysql",
  dialectOptions: {
    ...(process.env.DB_SSL === 'true' ? {
      ssl: {
        rejectUnauthorized: process.env.DB_SSL_STRICT !== 'false',
      },
    } : {}),
  },
  pool: {
    max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : 5,
    min: process.env.DB_POOL_MIN ? parseInt(process.env.DB_POOL_MIN) : 0,
    acquire: 30000,
    idle: process.env.DB_POOL_IDLE ? parseInt(process.env.DB_POOL_IDLE) : 10000,
    evict: process.env.DB_POOL_EVICT ? parseInt(process.env.DB_POOL_EVICT) : 1000,
  },
};
