import { createLogger, format, transports } from "winston";

import { env } from "../config/env";

const { combine, timestamp, errors, json, colorize, simple } = format;

const logger = createLogger({
  level: env.logLevel,
  defaultMeta: {
    service: env.serviceName,
    environment: env.nodeEnv
  },
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  transports: [
    new transports.Console({
      format:
        env.nodeEnv === "development"
          ? combine(colorize(), simple())
          : combine(timestamp(), json())
    })
  ]
});

export default logger;
