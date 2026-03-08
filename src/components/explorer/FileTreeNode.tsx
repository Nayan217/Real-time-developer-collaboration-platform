import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileNode, RoomParticipant } from '@/types';

const EXT_ICONS: Record<string, string> = {
  tsx: '⚛', jsx: '⚛', ts: 'TS', js: 'JS', py: '🐍', cpp: 'C+', java: '☕', go: 'Go',
  json: '{}', css: '#', html: '<>', md: 'M↓',
};

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  activeFilePath: string | null;
  participants: RoomParticipant[];
  onFileSelect: (node: FileNode) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}

const FileTreeNode = ({ node, depth, activeFilePath, participants, onFileSelect, onContextMenu }: FileTreeNodeProps) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const isActive = node.path === activeFilePath;
  const ext = node.name.split('.').pop() || '';
  const usersOnFile = participants.filter(p => p.activeFile === node.path);

  const handleClick = () => {
    if (node.type === 'folder') {
      setExpanded(!expanded);
    } else {
      onFileSelect(node);
    }
  };

  return (
    <div>
      <div
        className={cn(
          'flex cursor-pointer items-center gap-1 py-[2px] pr-3 text-[13px] hover:bg-secondary/50',
          isActive && 'bg-secondary text-foreground'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {node.type === 'folder' ? (
          <>
            {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            {expanded ? <FolderOpen className="h-4 w-4 shrink-0 text-warning" /> : <Folder className="h-4 w-4 shrink-0 text-warning" />}
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            {EXT_ICONS[ext] ? (
              <span className="w-4 shrink-0 text-center text-[10px] font-bold text-muted-foreground">{EXT_ICONS[ext]}</span>
            ) : (
              <File className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </>
        )}
        <span className="truncate">{node.name}</span>
        {usersOnFile.length > 0 && (
          <div className="ml-auto flex -space-x-1">
            {usersOnFile.map(u => (
              <div
                key={u.userId}
                className="h-2.5 w-2.5 rounded-full border border-card"
                style={{ backgroundColor: u.color }}
                title={u.username}
              />
            ))}
          </div>
        )}
      </div>
      {node.type === 'folder' && expanded && node.children?.map(child => (
        <FileTreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          activeFilePath={activeFilePath}
          participants={participants}
          onFileSelect={onFileSelect}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
};

export default FileTreeNode;
