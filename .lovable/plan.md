

# Plan: VS Code-Style DevSync Redesign

This is a major overhaul transforming the current simple collaborative editor into a full VS Code-style IDE with multi-file support, file explorer, git panel, and terminal.

## Database Changes

**New tables:**
- `room_files` — stores files per room with path, content, language, version
- `branch_locks` — tracks active branch per room for real-time sync

**Schema modifications:**
- Add `repo_url` and `active_branch` columns to `rooms` table
- Add `github_username` column to `profiles` table
- Enable Realtime on `room_files` and `branch_locks`
- RLS policies for new tables (authenticated users can CRUD files in rooms, read branch locks)

**Migration SQL:**
```sql
-- room_files
CREATE TABLE room_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  content text DEFAULT '',
  language text DEFAULT 'plaintext',
  version int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(room_id, file_path)
);
ALTER TABLE room_files ENABLE ROW LEVEL SECURITY;
-- policies: authenticated can select/insert/update/delete

-- branch_locks
CREATE TABLE branch_locks (
  room_id text PRIMARY KEY,
  branch_name text DEFAULT 'main',
  locked_by text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE branch_locks ENABLE ROW LEVEL SECURITY;

-- Add columns to rooms
ALTER TABLE rooms ADD COLUMN repo_url text;
ALTER TABLE rooms ADD COLUMN active_branch text DEFAULT 'main';

-- Add to profiles
ALTER TABLE profiles ADD COLUMN github_username text;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE room_files;
ALTER PUBLICATION supabase_realtime ADD TABLE branch_locks;
```

## Type Definitions

Create `src/types/index.ts` with:
- `FileNode` — tree structure for file explorer
- `ExecutionResult` — stdout, stderr, exitCode, executionTime, status
- `RoomParticipant` — userId, username, color, activeFile
- `OpenTab` — file id, path, name, isDirty, language

## Updated Edge Function: execute-code

- Add support for `typescript` and `go` language IDs
- Add Piston API fallback when Judge0 fails
- Return `exitCode` and improved `executionTime`

## New Components

### Layout Components
1. **`VSCodeLayout.tsx`** — CSS Grid shell: activity bar + sidebar + editor + bottom panel + status bar
2. **`ActivityBar.tsx`** — Narrow icon strip (Files, Git, Chat icons) with active indicator
3. **`StatusBar.tsx`** — Bottom bar: branch name, cursor position, language, online count (bg #007acc)

### File Explorer
4. **`FileExplorer.tsx`** — Recursive tree from `room_files`, file icons by extension, right-click context menu (New File, New Folder, Rename, Delete)
5. **`FileTreeNode.tsx`** — Individual tree node with expand/collapse, icon, click-to-open

### Editor
6. **`EditorTabs.tsx`** — Horizontal tab bar with close buttons, dirty indicator (dot), active tab styling
7. **`MonacoEditor.tsx`** (rename from CodeEditor) — Monaco with VS Code dark theme, auto-detect language from extension, realtime sync via `room_files` subscription

### Git Panel
8. **`GitPanel.tsx`** — Branch selector, commit message input, commit history list. Branch changes write to `branch_locks` and reload files.

### Terminal Panel
9. **`TerminalPanel.tsx`** — Styled output with colored stdout/stderr/system messages, run indicator, clear button, done/error status

### Chat Panel
10. **`ChatPanel.tsx`** — Updated styling to match VS Code sidebar aesthetic

### Participant display
11. Update presence to track `activeFile` — show colored dots next to files in explorer

## Room Page Rewrite

Complete rewrite of `src/pages/Room.tsx`:
- Replace current flex layout with CSS Grid (`grid-template-columns: 48px 240px 1fr 300px; grid-template-rows: 1fr 200px 24px`)
- Activity bar controls which left panel is shown (Files/Git/Chat)
- Multiple file tabs, open/close files
- Terminal panel replaces old OutputPanel (resizable via drag handle)
- Status bar at bottom
- Right sidebar toggleable for chat
- Mobile: sidebar as bottom sheet drawer, terminal collapses

## Color & Font Updates

Update `src/index.css`:
- Editor bg: `#1e1e1e`, sidebar: `#252526`, tabs: `#333333`, accent: `#007acc`
- Import DM Sans from Google Fonts for UI text
- Git diff colors: added `#4ec9b0`, modified `#e2c08d`, deleted `#f14c4c`

## File Structure Summary

```text
src/
  types/
    index.ts              -- All shared interfaces
  components/
    layout/
      VSCodeLayout.tsx     -- Grid shell
      ActivityBar.tsx      -- Icon sidebar
      StatusBar.tsx        -- Bottom status bar
    editor/
      EditorTabs.tsx       -- File tabs
      MonacoEditor.tsx     -- Monaco wrapper
    explorer/
      FileExplorer.tsx     -- File tree
      FileTreeNode.tsx     -- Tree node
    git/
      GitPanel.tsx         -- Branch + commit UI
    terminal/
      TerminalPanel.tsx    -- Output panel
    ChatPanel.tsx          -- Updated chat
    ParticipantList.tsx    -- Updated presence
    RoomCard.tsx           -- (unchanged)
    CreateRoomModal.tsx    -- (unchanged)
    JoinRoomModal.tsx      -- (unchanged)
  pages/
    Room.tsx               -- Full rewrite using VSCodeLayout
    Landing.tsx            -- Minor color updates
    Dashboard.tsx          -- (mostly unchanged)
    Auth.tsx               -- (unchanged)
    History.tsx            -- (unchanged)
```

## Implementation Order

1. Database migration (new tables + columns)
2. Create `src/types/index.ts`
3. Update `src/index.css` with new colors and DM Sans font
4. Build layout components (VSCodeLayout, ActivityBar, StatusBar)
5. Build FileExplorer + FileTreeNode
6. Build EditorTabs + MonacoEditor with multi-file support
7. Build TerminalPanel
8. Build GitPanel
9. Update ChatPanel styling
10. Rewrite Room.tsx to assemble everything
11. Update execute-code edge function (typescript/go + Piston fallback)
12. Mobile responsive adjustments

