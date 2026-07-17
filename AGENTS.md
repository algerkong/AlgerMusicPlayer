## Track / SongResult

- 元数据用 `Track`；会话态用 `PlaybackRuntime`；换曲只经 `playbackCoordinator`。
- `SongResult` 规范字段：`artists` / `album` / `duration`（已无 `ar`/`al`/`dt`）。
- 读字段：`songFields` 或 `toPlayableView`。门禁：`npm run lint:song-fields`。
- 路线图：`docs/track-migration.md`。

<!-- CODEGRAPH_START -->

## CodeGraph

This project has a CodeGraph MCP server configured, exposing a single tool: `codegraph_explore`. CodeGraph is a tree-sitter-parsed knowledge graph of every symbol, edge, and file. Reads are sub-millisecond and return structural information grep cannot.

### Use codegraph_explore instead of reading files

Reach for `codegraph_explore` before grep/find or Read for any **structural** question — how does X work, how does X reach Y, what calls what, where is X defined, or surveying an area. It takes a natural-language question or a bag of symbol/file names and returns the relevant symbols' **verbatim, line-numbered source** grouped by file (the same `<n>\t<line>` shape Read gives you, safe to Edit from), plus the call paths between them — including dynamic-dispatch hops (callbacks, React re-render, JSX children) grep can't follow — and a blast-radius summary of what depends on them. Name a file or symbol in the query to read its current source.

### Rules of thumb

- **Answer directly — don't delegate exploration.** ONE `codegraph_explore` usually answers the whole question; follow up with another `codegraph_explore` naming more specific symbols if you need more. Codegraph IS the pre-built index, so spawning a separate file-reading sub-task/agent — or running a grep + read loop — repeats work codegraph already did and costs more for the same answer.
- **Trust codegraph results.** They come from a full AST parse. Do NOT re-verify them with grep — that's slower, less accurate, and wastes context.
- **Don't grep or Read first** to find or understand indexed code — one `codegraph_explore` returns the relevant source in a single round-trip. Reach for raw Read/Grep only to confirm a specific detail codegraph didn't cover, or for what it doesn't index (configs, docs).
- **Index lag — check the staleness banner, don't guess a wait.** When a codegraph response starts with "⚠️ Some files referenced below were edited since the last index sync…", the listed files are pending re-index — Read those specific files for accurate content. Files NOT in that banner are fresh and codegraph is authoritative for them.

### If `.codegraph/` doesn't exist

The MCP server returns "not initialized." Ask the user: _"I notice this project doesn't have CodeGraph initialized. Want me to run `codegraph init -i` to build the index?"_
<!-- CODEGRAPH_END -->
