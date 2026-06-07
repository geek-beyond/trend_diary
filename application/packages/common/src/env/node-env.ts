export function isDevelopmentNodeEnv() {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'development'
}
