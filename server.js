const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const sls = require("serverless-http");
require('dotenv').config();

const app = express();

// Security headers (H-9)
app.use(helmet());

// Restrict CORS to known origins (C-1)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:4200'];

app.use(cors({
  origin: (origin, callback) => {
    // allow server-to-server (no origin) and listed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true
}));

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

const db = require("./app/models");

db.sequelize.sync({ alter: false })
  .then(() => {
    console.log("Synced db.");
  })
  .catch((err) => {
    console.error("Failed to sync db: " + err.message);
    process.exit(1);
  });

const ApiLog = db.apiLog;

// Scrub sensitive fields before logging (C-5)
const SENSITIVE_KEYS = new Set([
  'password', 'currentPassword', 'newPassword',
  'token', 'refreshToken', 'accessToken',
  'ResetToken', 'VerificationToken'
]);
function scrubBody(body) {
  if (!body || typeof body !== 'object') return body;
  const scrubbed = { ...body };
  for (const key of SENSITIVE_KEYS) {
    if (key in scrubbed) scrubbed[key] = '[REDACTED]';
  }
  return scrubbed;
}

app.use((req, res, next) => {
  const oldJson = res.json;
  res.json = (body) => {
    res.locals.body = body;
    return oldJson.call(res, body);
  };


  const oldSend = res.send;
  res.send = (body) => {
    res.locals.body = body;
    return oldSend.call(res, body);
  };


  res.on('finish', () => {
    ApiLog.create({
      requestBody: JSON.stringify(scrubBody(req.body)),
      endpoint: req.originalUrl,
      responseBody: JSON.stringify(scrubBody(res.locals.body))
    }).catch(err => console.error('ApiLog error:', err));
  })
  next()
})

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Hello World!" });
});

require("./app/routes/user.routes")(app);
require("./app/routes/modulo.routes")(app);
require("./app/routes/feature.routes")(app);
require("./app/routes/task.routes")(app);
require("./app/routes/group.routes")(app);
require("./app/routes/taskFeature.routes")(app);
require("./app/routes/auth.routes")(app);
require("./app/routes/patient.routes")(app);
require("./app/routes/department.routes")(app);
require("./app/routes/visitReason.routes")(app);
require("./app/routes/visit.routes")(app);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

module.exports.server = sls(app);
