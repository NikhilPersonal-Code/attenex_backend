export const logger = {
  info: (message: string, ...args) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  error: (message: string, ...args) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  warn: (message: string, ...args) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
};
