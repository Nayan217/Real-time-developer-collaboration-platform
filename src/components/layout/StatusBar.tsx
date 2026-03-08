import { GitBranch, Users, CheckCircle2 } from 'lucide-react';

interface StatusBarProps {
  branch: string;
  language: string;
  cursorLine: number;
  cursorCol: number;
  onlineCount: number;
  saved: boolean;
}

const StatusBar = ({ branch, language, cursorLine, cursorCol, onlineCount, saved }: StatusBarProps) => {
  return (
    <div className="flex h-6 items-center justify-between bg-status-bar px-3 text-[11px] text-status-bar-fg">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <GitBranch className="h-3 w-3" />
          {branch}
        </span>
        {saved && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Saved
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span>Ln {cursorLine}, Col {cursorCol}</span>
        <span>{language}</span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {onlineCount}
        </span>
      </div>
    </div>
  );
};

export default StatusBar;
