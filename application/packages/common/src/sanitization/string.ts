import { UndefinedOr } from '../types/utility'

export default function extractTrimmed(value?: string): UndefinedOr<string> {
  return value && value.trim() ? value.trim() : undefined
}
