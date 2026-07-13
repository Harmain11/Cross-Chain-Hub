// Minimal LCS-based line diff. Returns a list of lines tagged as unchanged,
// added, or removed, in display order (removed lines from the old version
// appear immediately before the added lines that replaced them).
export type DiffLine = {
  type: "same" | "add" | "remove"
  text: string
}

export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n")
  const b = newText.split("\n")
  const n = a.length
  const m = b.length

  // dp[i][j] = length of LCS of a[i:] and b[j:]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const result: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      result.push({ type: "same", text: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "remove", text: a[i] })
      i++
    } else {
      result.push({ type: "add", text: b[j] })
      j++
    }
  }
  while (i < n) {
    result.push({ type: "remove", text: a[i] })
    i++
  }
  while (j < m) {
    result.push({ type: "add", text: b[j] })
    j++
  }
  return result
}
