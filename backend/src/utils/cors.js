function splitOrigins(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAllowedOrigins() {
  return Array.from(new Set([
    ...splitOrigins(process.env.CORS_ORIGINS),
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL
  ].filter(Boolean)));
}

function createCorsOriginHandler() {
  const allowedOrigins = getAllowedOrigins();

  if (!allowedOrigins.length) {
    return (_origin, callback) => callback(null, true);
  }

  return (origin, callback) => {
    // Allow requests without Origin, such as health checks and some WebViews.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  };
}

module.exports = {
  getAllowedOrigins,
  createCorsOriginHandler
};
