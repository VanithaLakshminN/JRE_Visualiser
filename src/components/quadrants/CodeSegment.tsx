import React, { useRef, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useJvmStore } from '../../store/useJvmStore';

const CodeSegment: React.FC = () => {
  const { editorCode, setEditorCode, pcRegister } = useJvmStore();
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    if (monaco && editorRef.current && pcRegister > 0) {
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        [
          {
            range: new monaco.Range(pcRegister, 1, pcRegister, 1),
            options: {
              isWholeLine: true,
              className: 'bg-indigo-500/20 border-l-4 border-indigo-500',
              glyphMarginClassName: 'bg-indigo-500 rounded-full w-2 h-2 ml-2 mt-1'
            }
          }
        ]
      );
      editorRef.current.revealLineInCenterIfOutsideViewport(pcRegister);
    } else if (monaco && editorRef.current && pcRegister === 0) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
  }, [pcRegister, monaco]);

  return (
    <div className="w-full h-full relative">
      <Editor
        height="100%"
        defaultLanguage="java"
        value={editorCode}
        onChange={(val) => setEditorCode(val || '')}
        theme="vs-dark"
        options={{
          minimap: { enabled: true, scale: 0.75 },
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineHeight: 24,
          glyphMargin: true,
          renderLineHighlight: 'all',
          padding: { top: 16 }
        }}
        onMount={handleEditorDidMount}
      />
    </div>
  );
};

export default CodeSegment;
