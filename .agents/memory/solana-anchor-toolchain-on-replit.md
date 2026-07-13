---
name: Solana/Anchor toolchain on Replit
description: How to get a real cargo-build-sbf compile + real Anchor IDL generation working in this environment, and the non-obvious constraints that block the naive approach.
---

## The problem
Nix's packaged `solana-cli`/`anchor-cli` bundle an old platform-tools `rustc` (1.75) whose crates.io graph resolution is too old for current crates (many now require `edition2024` transitively). Pinning individual crate versions is whack-a-mole, not a real fix.

## The fix that works
- Install the official Agave Solana CLI via the `release.anza.xyz` installer script into a writable home dir (`~/.local/share/solana/install/active_release`), not the Nix package. It bundles a much newer platform-tools rustc and makes `cargo-build-sbf` succeed on modern Anchor projects.
- `cargo-build-sbf` internally shells out to a system `rustup` binary purely for toolchain dispatch, even though the ambient Rust here is Nix-managed (no real rustup). You need a **standalone rustup install** (separate `RUSTUP_HOME`/`CARGO_HOME`, `--no-modify-path --default-toolchain none`) just to satisfy this — cargo-build-sbf manages its own internal `solana` toolchain link automatically once rustup exists; don't fight that part.
- `anchor build`'s IDL step tries to install a real `nightly` rustup toolchain. That install can hit a hard, non-negotiable `EDQUOT` ("Disk quota exceeded") in this environment — reproduces identically under `/tmp` and `/home/runner`. It is a real quota (not raw disk space; `df -h` can show it mostly empty) that is sensitive to file-count/write-burst churn (e.g. many small fingerprint files from a fresh `cargo` debug build), not necessarily to the specific directory.
  - Workaround: link the ambient Nix-provided stable Rust toolchain (found via `rustc --print sysroot`) into the standalone rustup as a **custom toolchain named `nix-host`** (rustup reserves the literal name `nightly`, so you can't just alias it), then run `anchor idl build` with `RUSTUP_TOOLCHAIN=nix-host` and `RUSTC_BOOTSTRAP=1` (unlocks the nightly-only `--cfg procmacro2_semver_exempt` flag on stable rustc). This produces a real, valid IDL JSON without ever installing a real nightly toolchain.
- The disk-quota error can also resurface transiently just from accumulated scratch-directory bloat left over from earlier manual exploration/testing (leftover `/tmp` test project dirs, old rustup homes, etc.) — clean those up if IDL generation starts failing with `EDQUOT` again after previously working.

## Design choices worth keeping
- Do toolchain installation lazily, idempotently, and in-process-cached inside server code (not baked into `.replit`/Nix config) — Nix config differences don't reproduce identically in a deployed container, but a curl-script install into a writable home dir does if the server re-runs its own setup on first use there too. Code must degrade to reporting "toolchain unavailable" rather than crash if install fails (network blocked, quota, etc.) in some environment.
- Reuse one temp build directory across repeated compiles within a single pipeline run (self-heal retries, hardening iterations) rather than a fresh tmpdir each time, so Cargo's incremental cache keeps repeat builds fast (~1-2min cold, ~10-30s warm). Delete the temp dir when the run finishes either way.
- For a "real, non-LLM-guessed" cost number to reconcile against actual build output, `solana rent <soSizeBytes> --lamports` gives an authoritative rent-exemption minimum from the real `.so` size. True compute-unit (CU) estimates still require simulating/deploying a transaction, so those remain a labeled LLM estimate, not computed here.
