/**
 * Generate a random 4-digit passcode
 */
export const generatePasscode = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Check if passcode needs refresh (older than 10 seconds)
 */
export const needsPasscodeRefresh = (lastUpdated: Date | null): boolean => {
  if (!lastUpdated) return true;
  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  return diffMs >= 10000; // 10 seconds
};
