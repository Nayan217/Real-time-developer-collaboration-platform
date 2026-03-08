import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useRef, useCallback } from 'react';

interface MonacoEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  onCursorChange?: (line: number, col: number) => void;
}

const MonacoEditor = ({ value, language, onChange, onCursorChange }: MonacoEditorProps) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.(e.position.lineNumber, e.position.column);
    });
  }, [onCursorChange]);

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={(val) => onChange(val || '')}
      theme="vs-dark"
      onMount={handleMount}
      options={{
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        minimap: { enabled: true, maxColumn: 80 },
        padding: { top: 12 },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
        tabSize: 2,
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
      }}
    />
  );
};

export default MonacoEditor;
