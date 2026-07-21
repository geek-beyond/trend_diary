// oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
export const captureThrow = (fn: () => never): unknown => {
  try {
    fn()
    return undefined
  } catch (e) {
    return e
  }
}
