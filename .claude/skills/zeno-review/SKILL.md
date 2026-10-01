---
name: zeno-review
description: >
  Code review for project-zeno-next that hunts design smells and aims for less
  code: duplicated idioms, shotgun surgery, wire shapes leaking past the
  boundary, loose types, null/undefined/falsy confusion, plus ponytail-style
  over-engineering. Reports only, never edits. Use when asked to review a PR,
  branch, commit range, or the working diff, or on "zeno review" /
  /zeno-review.
allowed-tools: Read Grep Glob Bash(git diff:*) Bash(git log:*) Bash(git show:*) Bash(git blame:*) Bash(gh pr view:*) Bash(gh pr diff:*)
---

Review a change the way a lazy senior reviewer would. The best outcome is that the codebase ends up with **less code and fewer places that know the same fact**. Each finding gives a location, the smell, the replacement, and the delta. The reference case is PR #660 ("Normalize at the Boundary"): one null-for-absent wire rule ended up re-derived in six functions. The fix is a single parse function, `toImageryMeta` in `app/utils/imagery.ts`.

This skill is **report-only**. Use read-only tools: `Read`, `Grep`, `Glob`, `git diff/log/show/blame`, `gh pr view/diff`. The output is the report in the terminal. The author applies the fixes. Do not edit files, commit, or post to the PR with `gh pr review`/`gh pr comment`.

## Steps

1. **Resolve the target.**
   - PR number → `gh pr diff <n>` and `gh pr view <n>`.
   - Branch → `git diff develop...<branch>`.
   - Commit or range → `git show` / `git diff <a>..<b>`.
   - Nothing given → `git diff develop` (working tree plus staged).

   Done when you hold the full diff and the list of changed files.

2. **Read beyond the diff.** For every changed function:
   - Read the whole file it lives in.
   - Grep its callers and siblings.
   - Grep the repo for the idiom it introduces (`!= null`, `?? legacy_name`, `?.` chains on the same object, repeated literal unions).

   A finding grounded only in the diff is a guess, so every `dup`, `shotgun`, and `reuse` finding names the other sites by `file:line`. Done when each changed function has been read in full context.

3. **Check the backend contract** when the diff touches wire shapes: `app/types/*`, `app/store/chat-tools/*`, `parse-stream-message.ts`, `api-client.ts`.
   - Look for the backend repo at `../project-zeno` (a sibling checkout). If it isn't there, ask the user for its path.
   - Confirm what is actually sent: explicit `null` vs omitted key, field names, legacy aliases.

   Done when each wire claim in your findings cites backend code, or the user has declined to provide the repo.

4. **Apply every rule below** to the change. Done when each tag has been considered against every changed file.
5. **Report** in the format below, most impactful first.

## Rules

Each rule is a tag. One finding per line.

**Design smells (from PR #660):**

- `dup:` **Duplicated Code**: the same rule re-derived in ≥2 places, even if not copy-pasted (re-derived is worse, because nothing keeps the copies in agreement). Replacement: one owner. Name it.
- `shotgun:` **Shotgun Surgery**: one reason to change touches several functions or files. It signals a missing abstraction. Replacement: the single function or type that should own the concept.
- `boundary:` **Normalize at the boundary / Parse, Don't Validate**: a raw wire shape travels past the stream boundary (`parseLangChainLine` → `processStreamMessage` → tool handler) into utils or components. Typical forms are null-for-absent, dual field names, and stringly payloads. Replacement: a `toX()` parse function at the handler that returns a resolved type, modelled on `toImageryMeta`.
- `type:` **Primitive Obsession / stronger types**:
  - `Partial<Pick<…>>` bags passed around and re-interpreted
  - optional fields that are always set
  - `string` where a literal union fits
  - `any`/`as` casts covering a shape question
  - a field that is always present but typed optional

  Replacement: a type that makes the illegal state unrepresentable. Show the signature.

- `paranoid:` **Repeated defensive checks** on the same input, where the code doesn't trust its own types. Replacement: settle the fact once upstream (usually `boundary:` or `type:`). Business rules ("enough data to show a WINDOW chip?") are confident code and stay. Flag only checks that re-verify the _shape_ of the data.
- `null:` **null vs undefined**:
  - Wire types keep `| null` exactly where the backend sends `null`. Stripping it lies about runtime.
  - Normalized and domain types use `field?: T` and carry no `| null`, unless two distinct kinds of absence must still be told apart downstream.
  - Flag either side being wrong.
- `falsy:` **Absent ≠ falsy**: a truthy check (`if (x)`, `x || d`, `&&` render) on a value where `0`, `""` or `false` is real data. Replacement: `!== undefined` or `??`.
- `test:` **TDD / Transformation Priority Premise**: a new normalizer, parser or branchy function ships without a test that would fail without its general case. Examples: null _and_ missing, legacy _and_ current field name. Name the missing case. The single smoke test is the minimum and never bloat.

**Less code (from ponytail-review):**

- `delete:` dead code, unused flexibility, a speculative feature. Replacement: nothing.
- `reuse:` re-implements a helper, type or pattern that already exists in this repo. Name its `file:line`.
- `stdlib:` hand-rolls something the standard library ships. Name the function.
- `native:` a dependency or code doing what the platform does. Name the feature.
- `yagni:` an interface with one implementation, config nobody sets, a layer with one caller. Inline it.
- `shrink:` same logic in fewer lines. Show the shorter form.

## Format

`<file>:L<line>: <tag>: <what>. <replacement>. (<delta>)`

`<delta>` names its axis: lines (`-12 lines`), check sites (`6 sites → 1`), or both. Some findings add code to remove a class of duplication, like a normalizer that is "+15 lines, 6 sites → 1". They are valid and their delta says so honestly.

✅ `app/utils/imagery.ts:L40: dup: \`meta.item_count != null\` re-derived in imageryLegendInfo, captureMetaLabel (L88), showImagery.ts:L61. One owner: toImageryMeta resolves it once. (3 sites → 1)`

✅ `app/store/chat-tools/showImagery.ts:L55: boundary: \`start_date ?? date_start\` legacy alias read past the handler. Parse into ImageryMeta here; utils take ImageryMeta only. (+15 lines, 8 checks in 6 fns → 8 in 1)`

✅ `app/types/chat.ts:L240: type: ImageryLegendMeta = Partial<Pick<ImageryInfo, …>> makes every field optional+nullable. \`interface ImageryMeta { provider: ImageryProvider; itemCount?: number; aoiNames: string[] }\`. (compile-time guarantee)`

✅ `app/utils/imagery.ts:L72: falsy: \`meta.itemCount ? …\` hides a 0-scene mosaic. \`!== undefined\`. (0 lines)`

✅ `app/utils/imagery.ts:L15: reuse: local formatDate duplicates formatImageryDate (imagery.ts:L9). Call it. (-8 lines)`

## Scoring

End with one line:

`net: <±N> lines, <M> check sites → <K> owners.`

Say which axis the change wins on and which it loses on. McCabe complexity can rise while duplication falls, as it did in PR #660 (62 → 65). Let no single number deliver the verdict.

If nothing survives the rules, write `Lean already. Ship.` and stop.

## Scope

Covered: design smells and complexity. Correctness bugs, security and performance belong to `/code-review` and `/security-review`, so mention them in one line at most and point to those skills.
