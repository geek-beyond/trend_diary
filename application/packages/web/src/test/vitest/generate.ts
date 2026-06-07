export const coverageReporter = ['text', 'json-summary', 'json']

export function generateIncludes(...paths: string[]) {
  const testInclude = paths.map((path) => `${path}/**/*.test.ts`)
  const coverageInclude = paths.map((path) => `${path}/**/*`)
  return { testInclude, coverageInclude }
}
