import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ExecutionResult } from '@/types';

interface TerminalLine {
  type: 'stdout' | 'stderr' | 'system';
  text: string;
}

interface TerminalPanelProps {
  lines: TerminalLine[];
  running: boolean;
  onClear: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const TerminalPanel = ({ lines, running, onClear, collapsed, onToggleCollapse }: TerminalPanelProps) => {
  return (
    <div className="flex h-full flex-col border-t border-border bg-background">
      <div className="flex h-[30px] items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Terminal</span>
          {running && (
            <span className="flex items-center gap-1 text-[11px] text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Running...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onClear} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Clear">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onToggleCollapse} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
            {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      {!collapsed && (
        <ScrollArea className="flex-1 p-3">
          <div className="font-mono text-[13px] leading-5">
            {lines.length === 0 && (
              <span className="text-muted-foreground">Ready.</span>
            )}
            {lines.map((line, i) => (
              <div key={i} className={
                line.type === 'stderr' ? 'text-destructive' :
                line.type === 'system' ? 'text-primary' :
                'text-foreground/85'
              }>
                {line.text}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export type { TerminalLine };
export default TerminalPanel;
