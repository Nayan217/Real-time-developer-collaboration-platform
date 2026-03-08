import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OpenTab } from '@/types';

interface EditorTabsProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

const EditorTabs = ({ tabs, activeTabId, onTabSelect, onTabClose }: EditorTabsProps) => {
  if (tabs.length === 0) return null;

  return (
    <div className="flex h-[35px] shrink-0 items-end overflow-x-auto bg-tab-inactive">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={cn(
              'group flex h-[35px] cursor-pointer items-center gap-2 border-r border-border px-3 text-[13px]',
              isActive
                ? 'bg-tab-active text-foreground border-t-[2px] border-t-primary'
                : 'text-muted-foreground hover:bg-secondary/30'
            )}
            onClick={() => onTabSelect(tab.id)}
          >
            {tab.isDirty && (
              <span className="h-2 w-2 rounded-full bg-foreground" />
            )}
            <span className="max-w-[120px] truncate">{tab.name}</span>
            <button
              className="rounded p-0.5 opacity-0 transition-opacity hover:bg-secondary group-hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onTabClose(tab.id); }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default EditorTabs;
