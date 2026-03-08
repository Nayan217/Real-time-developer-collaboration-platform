import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
}

const languageMap: Record<string, string> = {
  javascript: 'javascript',
  python: 'python',
  cpp: 'cpp',
  java: 'java',
};

const CodeEditor = ({ value, onChange, language }: CodeEditorProps) => {
  return (
    <Editor
      height="100%"
      language={languageMap[language] || 'javascript'}
      value={value}
      onChange={(val) => onChange(val || '')}
      theme="vs-dark"
      options={{
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        minimap: { enabled: false },
        padding: { top: 16 },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
        tabSize: 2,
      }}
    />
  );
};

export default CodeEditor;
