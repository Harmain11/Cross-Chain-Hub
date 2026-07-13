---
name: Extracting multiple fenced code blocks from an LLM response
description: Naive string-indexing to find a second/later fenced code block (e.g. a JSON block after a code block) in one LLM response is fragile and silently corrupts output.
---

When prompting an LLM to return two fenced blocks in one response (e.g. a Rust source block followed by a JSON IDL block), don't locate the second block with ad hoc string slicing like `text.slice(text.indexOf("\`\`\`json") + 1)` — off-by-one slicing on the backtick count breaks the downstream regex match, and the code silently falls back to returning the *whole remaining text* (fences and all) instead of throwing, so the corruption isn't caught until something tries to `JSON.parse` it later (or, worse, ships to the client unparsed).

**Why:** hit this generating a Solana Anchor program + its IDL in one LLM call — the stored "IDL" string had trailing/leading backtick fence characters mixed in and failed `JSON.parse` on the frontend.

**How to apply:** when an LLM response is expected to contain multiple fenced blocks, extract *all* of them in one pass with a global regex (`/\`\`\`(\w+)?\n([\s\S]*?)\`\`\`/g`), then pick each block by its language tag (or position) from the resulting array. Validate structured blocks (e.g. `JSON.parse`) immediately and throw if parsing fails, rather than persisting an unvalidated fallback string.
