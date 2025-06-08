import React, { useState, useRef } from 'react';
import { Button } from '../common/Button';
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react';

interface DocumentUploadProps {
  onResumeUpload?: (content: string) => void;
  onJobDescriptionUpload?: (content: string) => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onResumeUpload,
  onJobDescriptionUpload,
}) => {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescFile, setJobDescFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<{ resume: boolean; jobDesc: boolean }>({
    resume: false,
    jobDesc: false,
  });
  const [errors, setErrors] = useState<{ resume: string | null; jobDesc: string | null }>({
    resume: null,
    jobDesc: null,
  });

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const jobDescInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only PDF, DOCX, and TXT files are allowed';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB';
    }
    return null;
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const result = e.target?.result;
        
        if (file.type === 'text/plain') {
          resolve(result as string);
        } else if (file.type === 'application/pdf') {
          // For MVP, we'll just return a placeholder. In production, use PDF.js
          resolve('[PDF content extracted - ' + file.name + ']');
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          // For MVP, we'll just return a placeholder. In production, use mammoth.js
          resolve('[DOCX content extracted - ' + file.name + ']');
        } else {
          reject(new Error('Unsupported file type'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.type === 'text/plain') {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const handleFileSelect = async (file: File, type: 'resume' | 'jobDesc') => {
    const error = validateFile(file);
    
    if (error) {
      setErrors(prev => ({ ...prev, [type]: error }));
      return;
    }

    setErrors(prev => ({ ...prev, [type]: null }));
    setUploading(prev => ({ ...prev, [type]: true }));

    try {
      const content = await extractTextFromFile(file);
      
      if (type === 'resume') {
        setResumeFile(file);
        onResumeUpload?.(content);
      } else {
        setJobDescFile(file);
        onJobDescriptionUpload?.(content);
      }
    } catch (err) {
      setErrors(prev => ({ 
        ...prev, 
        [type]: err instanceof Error ? err.message : 'Failed to process file'
      }));
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleRemoveFile = (type: 'resume' | 'jobDesc') => {
    if (type === 'resume') {
      setResumeFile(null);
      onResumeUpload?.('');
      if (resumeInputRef.current) resumeInputRef.current.value = '';
    } else {
      setJobDescFile(null);
      onJobDescriptionUpload?.('');
      if (jobDescInputRef.current) jobDescInputRef.current.value = '';
    }
    setErrors(prev => ({ ...prev, [type]: null }));
  };

  const FileUploadSection = ({ 
    title, 
    description, 
    file, 
    error, 
    isUploading, 
    inputRef, 
    type 
  }: {
    title: string;
    description: string;
    file: File | null;
    error: string | null;
    isUploading: boolean;
    inputRef: React.RefObject<HTMLInputElement>;
    type: 'resume' | 'jobDesc';
  }) => (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-2">{title}</h4>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      
      {!file ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
                loading={isUploading}
              >
                Choose File
              </Button>
              <p className="text-xs text-gray-500">
                PDF, DOCX, or TXT (max 5MB)
              </p>
            </div>
          </div>
          
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file, type);
            }}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">{file.name}</p>
              <p className="text-xs text-green-700">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={() => handleRemoveFile(type)}
            className="text-green-600 hover:text-green-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {error && (
        <div className="mt-2 flex items-center gap-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-medium text-gray-900">Document Upload</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FileUploadSection
          title="Resume/CV"
          description="Upload your resume for personalized questions"
          file={resumeFile}
          error={errors.resume}
          isUploading={uploading.resume}
          inputRef={resumeInputRef}
          type="resume"
        />
        
        <FileUploadSection
          title="Job Description"
          description="Upload the job description for role-specific practice"
          file={jobDescFile}
          error={errors.jobDesc}
          isUploading={uploading.jobDesc}
          inputRef={jobDescInputRef}
          type="jobDesc"
        />
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Privacy Note</h4>
            <p className="text-sm text-blue-800">
              Your documents are processed securely and are only used to generate personalized interview questions. 
              They are not stored permanently and are deleted after your session ends.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;