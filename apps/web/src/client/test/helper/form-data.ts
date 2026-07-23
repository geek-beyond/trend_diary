export function buildFormData(entries: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [name, value] of Object.entries(entries)) {
    formData.append(name, value)
  }
  return formData
}
