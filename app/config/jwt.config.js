function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    // In production fail hard; in development allow a weak fallback but warn loudly
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`FATAL: environment variable '${name}' must be set in production.`);
    }
    console.warn(`WARNING: '${name}' is not set. Using insecure fallback — set this in .env before going to production.`);
    return name.toLowerCase().replace(/_/g, '-') + '-dev-only';
  }
  return value;
}

module.exports = {
  ACCESS_TOKEN_PRIVATE_KEY: requireEnv('ACCESS_TOKEN_PRIVATE_KEY'),
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || "1h",
  REFRESH_TOKEN_PRIVATE_KEY: requireEnv('REFRESH_TOKEN_PRIVATE_KEY'),
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",
  RESET_TOKEN_PRIVATE_KEY: requireEnv('RESET_TOKEN_PRIVATE_KEY'),
  RESET_TOKEN_EXPIRES_IN: process.env.RESET_TOKEN_EXPIRES_IN || "1h",
  VERIFY_TOKEN_PRIVATE_KEY: requireEnv('VERIFY_TOKEN_PRIVATE_KEY'),
  VERIFY_TOKEN_EXPIRES_IN: process.env.VERIFY_TOKEN_EXPIRES_IN || "1d",
};
