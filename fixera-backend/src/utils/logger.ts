import fs from 'fs';
import path from 'path';
import { createLogger, format, transports } from 'winston';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const isProduction = process.env.NODE_ENV === 'production';

const logger = createLogger({
  level: 'info',
  format: isProduction
    ? format.combine(format.timestamp(), format.json())
    : format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(({ level, message, timestamp, ...meta }) => {
          const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}]: ${message}${metaString}`;
        })
      ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    new transports.File({ filename: path.join(logsDir, 'combined.log') }),
  ],
});

export default logger;

