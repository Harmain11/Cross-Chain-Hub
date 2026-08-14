/**
 * EIP / ERC specification fetcher.
 *
 * Fetches EIP markdown from GitHub's raw content endpoint, trims it to a
 * token-safe size, and caches the result in-process so repeated lookups
 * within one agent run don't make duplicate HTTP requests.
 */

const EIP_CACHE = new Map<number, string>();

const EIP_RAW =
  "https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-{n}.md";

const MAX_EIP_CHARS = 4_000; // keep context reasonable

export interface EipResult {
  eip: number;
  found: boolean;
  content: string; // trimmed markdown, or an error message
}

export async function fetchEipSpec(eipNumber: number): Promise<EipResult> {
  if (EIP_CACHE.has(eipNumber)) {
    return { eip: eipNumber, found: true, content: EIP_CACHE.get(eipNumber)! };
  }

  const url = EIP_RAW.replace("{n}", String(eipNumber));

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "aura-forge/1.0" },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      return {
        eip: eipNumber,
        found: false,
        content: `EIP-${eipNumber} not found on GitHub (HTTP ${res.status}).`,
      };
    }

    let text = await res.text();

    // Strip the YAML front-matter header (everything before the first `##`)
    const bodyStart = text.indexOf("\n## ");
    if (bodyStart !== -1) {
      text = text.slice(bodyStart).trim();
    }

    // Keep only Abstract + Specification sections for brevity
    const sections = ["## Abstract", "## Specification", "## Motivation"];
    let extracted = "";
    for (const heading of sections) {
      const idx = text.indexOf(heading);
      if (idx === -1) continue;
      // Find where the next top-level section begins
      const next = text.indexOf("\n## ", idx + heading.length);
      extracted +=
        (next === -1 ? text.slice(idx) : text.slice(idx, next)).trim() + "\n\n";
    }

    const trimmed =
      (extracted || text).slice(0, MAX_EIP_CHARS) +
      ((extracted || text).length > MAX_EIP_CHARS ? "\n\n[… truncated …]" : "");

    EIP_CACHE.set(eipNumber, trimmed);
    return { eip: eipNumber, found: true, content: trimmed };
  } catch (err) {
    return {
      eip: eipNumber,
      found: false,
      content: `Failed to fetch EIP-${eipNumber}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
