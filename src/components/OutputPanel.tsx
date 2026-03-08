import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Terminal, AlertCircle } from 'lucide-react';

interface OutputPanelProps {
  stdout: string;
  stderr: string;
  status: string;
  time: string;
}

const OutputPanel = ({ stdout, stderr, status, time }: OutputPanelProps) => {
  return (
    <div className="flex h-full flex-col border-t border-border bg-card">
      <Tabs defaultValue="output" className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-4">
          <TabsList className="h-9 bg-transparent">
            <TabsTrigger value="output" className="gap-1 text-xs data-[state=active]:bg-muted">
              <Terminal className="h-3 w-3" /> Output
            </TabsTrigger>
            <TabsTrigger value="errors" className="gap-1 text-xs data-[state=active]:bg-muted">
              <AlertCircle className="h-3 w-3" /> Errors
            </TabsTrigger>
          </TabsList>
          {time && (
            <span className="text-xs text-muted-foreground">
              {status} • {time}s
            </span>
          )}
        </div>
        <TabsContent value="output" className="m-0 flex-1 overflow-auto p-4">
          <pre className="font-mono text-sm text-foreground/90 whitespace-pre-wrap">
            {stdout || 'No output'}
          </pre>
        </TabsContent>
        <TabsContent value="errors" className="m-0 flex-1 overflow-auto p-4">
          <pre className="font-mono text-sm text-destructive whitespace-pre-wrap">
            {stderr || 'No errors'}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OutputPanel;
