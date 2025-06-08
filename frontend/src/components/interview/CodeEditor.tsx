import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Play, Copy, RotateCcw, Code } from 'lucide-react';

interface CodeEditorProps {
  onCodeSubmit?: (code: string, language: string) => void;
  initialCode?: string;
  language?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  onCodeSubmit,
  initialCode = '',
  language = 'javascript',
}) => {
  const [code, setCode] = useState(initialCode);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const languages = [
    { id: 'javascript', name: 'JavaScript', example: 'function solution(arr) {\n  // Your code here\n  return arr;\n}' },
    { id: 'python', name: 'Python', example: 'def solution(arr):\n    # Your code here\n    return arr' },
    { id: 'java', name: 'Java', example: 'public class Solution {\n    public int[] solution(int[] arr) {\n        // Your code here\n        return arr;\n    }\n}' },
    { id: 'cpp', name: 'C++', example: '#include <vector>\nusing namespace std;\n\nvector<int> solution(vector<int>& arr) {\n    // Your code here\n    return arr;\n}' },
  ];

  const handleLanguageChange = (newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    const langExample = languages.find(l => l.id === newLanguage)?.example || '';
    setCode(langExample);
  };

  const handleSubmit = async () => {
    if (!code.trim()) return;
    
    setIsSubmitting(true);
    try {
      onCodeSubmit?.(code, selectedLanguage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleReset = () => {
    const langExample = languages.find(l => l.id === selectedLanguage)?.example || '';
    setCode(langExample);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Code className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Code Editor</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={selectedLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
          >
            {languages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="relative">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-64 p-4 font-mono text-sm bg-gray-900 text-green-400 resize-none focus:outline-none"
          placeholder="Write your code here..."
          spellCheck={false}
        />
        
        {/* Simple syntax highlighting overlay would go here in a real implementation */}
      </div>
      
      <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Copy}
            onClick={handleCopy}
          >
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
        
        <Button
          variant="primary"
          size="sm"
          icon={Play}
          onClick={handleSubmit}
          disabled={!code.trim() || isSubmitting}
          loading={isSubmitting}
        >
          Submit Code
        </Button>
      </div>
      
      <div className="px-4 pb-4">
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Tip:</span> Write clean, well-commented code. 
            Explain your thought process as you code, including time and space complexity considerations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;