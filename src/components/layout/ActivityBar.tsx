import { Files, GitBranch, MessageSquare, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ActivityPanel = 'files' | 'git' | 'chat' | null;

interface ActivityBarProps {
  activePanel: ActivityPanel;
  onPanelChange: (panel: ActivityPanel) => void;
}

const items = [
  { id: 'files' as const, icon: Files, label: 'Explorer' },
  { id: 'git' as const, icon: GitBranch, label: 'Source Control' },
  { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
];

const ActivityBar = ({ activePanel, onPanelChange }: ActivityBarProps) => {
  return (
    <div className="flex h-full w-12 flex-col items-center border-r border-border bg-activity-bar py-2">
      {items.map((item) => {
        const isActive = activePanel === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onPanelChange(isActive ? null : item.id)}
            title={item.label}
            className={cn(
              'relative flex h-12 w-full items-center justify-center text-activity-bar-fg transition-colors hover:text-activity-bar-active',
              isActive && 'text-activity-bar-active'
            )}
          >
            {isActive && (
              <div className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 bg-primary" />
            )}
            <item.icon className="h-5 w-5" />
          </button>
        );
      })}
      <div className="mt-auto">
        <button
          title="Settings"
          className="flex h-12 w-full items-center justify-center text-activity-bar-fg transition-colors hover:text-activity-bar-active"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default ActivityBar;
