module.exports = {
  HOST: process.env.DB_HOST || "localhost",
  PORT: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  USER: process.env.DB_USERNAME || process.env.DB_USER || "appUser",
  PASSWORD: process.env.DB_PASSWORD || "appUser1",
  DB: process.env.DB_DATABASE || process.env.DB_NAME || "JTK",
  dialect: "mysql",
  // Enable SSL for TiDB Cloud / any cloud MySQL
  dialectOptions: process.env.DB_SSL === 'true' ? {
    ssl: {
      rejectUnauthorized: true
    }
  } : {},
  pool: {
    max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};
