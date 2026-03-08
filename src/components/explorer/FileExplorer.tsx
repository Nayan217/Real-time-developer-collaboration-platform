import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Plus, FolderPlus, Trash2, Pencil } from 'lucide-react';
import FileTreeNode from './FileTreeNode';
import type { FileNode, RoomFile, RoomParticipant } from '@/types';
import { toast } from 'sonner';

interface FileExplorerProps {
  roomId: string;
  roomName: string;
  files: RoomFile[];
  activeFilePath: string | null;
  participants: RoomParticipant[];
  onFileSelect: (fileId: string, filePath: string) => void;
  onFilesChange: () => void;
}

function buildTree(files: RoomFile[]): FileNode[] {
  const root: FileNode[] = [];
  const folderMap = new Map<string, FileNode>();

  const sorted = [...files].sort((a, b) => a.file_path.localeCompare(b.file_path));

  for (const file of sorted) {
    const parts = file.file_path.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (i === parts.length - 1) {
        // File node
        const fileNode: FileNode = {
          id: file.id,
          name: part,
          path: file.file_path,
          type: 'file',
          language: file.language,
        };
        if (parentPath && folderMap.has(parentPath)) {
          folderMap.get(parentPath)!.children!.push(fileNode);
        } else {
          root.push(fileNode);
        }
      } else {
        // Folder node
        if (!folderMap.has(currentPath)) {
          const folderNode: FileNode = {
            id: `folder-${currentPath}`,
            name: part,
            path: currentPath,
            type: 'folder',
            children: [],
          };
          folderMap.set(currentPath, folderNode);
          if (parentPath && folderMap.has(parentPath)) {
            folderMap.get(parentPath)!.children!.push(folderNode);
          } else {
            root.push(folderNode);
          }
        }
      }
    }
  }

  return root;
}

const LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', cpp: 'cpp', java: 'java', go: 'go',
  json: 'json', css: 'css', html: 'html', md: 'markdown',
};

const FileExplorer = ({ roomId, roomName, files, activeFilePath, participants, onFileSelect, onFilesChange }: FileExplorerProps) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode | null } | null>(null);
  const [creating, setCreating] = useState<{ type: 'file' | 'folder'; parentPath: string } | null>(null);
  const [newName, setNewName] = useState('');

  const tree = buildTree(files);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleRootContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node: null });
  }, []);

  const handleFileSelect = useCallback((node: FileNode) => {
    if (node.type === 'file') {
      onFileSelect(node.id, node.path);
    }
  }, [onFileSelect]);

  const createFile = async () => {
    if (!newName.trim()) return;
    const parentPath = creating?.type === 'folder'
      ? (creating.parentPath ? `${creating.parentPath}/${newName.trim()}` : newName.trim())
      : (creating?.parentPath ? `${creating.parentPath}/${newName.trim()}` : newName.trim());

    if (creating?.type === 'folder') {
      // Create a placeholder file inside the folder
      const placeholderPath = `${parentPath}/.gitkeep`;
      await supabase.from('room_files').insert({ room_id: roomId, file_path: placeholderPath, content: '', language: 'plaintext' });
    } else {
      const ext = newName.trim().split('.').pop() || '';
      const lang = LANG_MAP[ext] || 'plaintext';
      await supabase.from('room_files').insert({ room_id: roomId, file_path: parentPath, content: '', language: lang });
    }
    setCreating(null);
    setNewName('');
    onFilesChange();
    toast.success(`${creating?.type === 'folder' ? 'Folder' : 'File'} created`);
  };

  const deleteFile = async (node: FileNode) => {
    if (node.type === 'folder') {
      // Delete all files with this prefix
      const filesToDelete = files.filter(f => f.file_path.startsWith(node.path + '/'));
      for (const f of filesToDelete) {
        await supabase.from('room_files').delete().eq('id', f.id);
      }
    } else {
      await supabase.from('room_files').delete().eq('id', node.id);
    }
    onFilesChange();
    toast.success('Deleted');
  };

  return (
    <div className="flex h-full flex-col bg-sidebar" onContextMenu={handleRootContextMenu}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {roomName}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => { setCreating({ type: 'file', parentPath: '' }); setNewName(''); }}
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="New File"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setCreating({ type: 'folder', parentPath: '' }); setNewName(''); }}
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="New Folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {creating && (
          <div className="flex items-center gap-1 px-3 py-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createFile(); if (e.key === 'Escape') setCreating(null); }}
              placeholder={creating.type === 'file' ? 'filename.ts' : 'folder-name'}
              className="h-6 text-xs"
              autoFocus
            />
          </div>
        )}
        {tree.map(node => (
          <FileTreeNode
            key={node.path}
            node={node}
            depth={0}
            activeFilePath={activeFilePath}
            participants={participants}
            onFileSelect={handleFileSelect}
            onContextMenu={handleContextMenu}
          />
        ))}
        {tree.length === 0 && !creating && (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            No files yet. Right-click or use + to create.
          </p>
        )}
      </ScrollArea>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded border border-border bg-popover py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-secondary"
            onClick={() => {
              const parentPath = contextMenu.node?.type === 'folder' ? contextMenu.node.path : '';
              setCreating({ type: 'file', parentPath });
              setNewName('');
              setContextMenu(null);
            }}
          >
            <Plus className="h-3 w-3" /> New File
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-secondary"
            onClick={() => {
              const parentPath = contextMenu.node?.type === 'folder' ? contextMenu.node.path : '';
              setCreating({ type: 'folder', parentPath });
              setNewName('');
              setContextMenu(null);
            }}
          >
            <FolderPlus className="h-3 w-3" /> New Folder
          </button>
          {contextMenu.node && (
            <>
              <div className="my-1 border-t border-border" />
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-secondary"
                onClick={() => { deleteFile(contextMenu.node!); setContextMenu(null); }}
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
