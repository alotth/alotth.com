import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { ImageUploadButton } from './image-upload';
import { Button } from './button';
import { Eye, Edit, ImageIcon } from 'lucide-react';
import type { Components } from 'react-markdown';
import { uploadImage } from '@/lib/supabase/storage';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
  preview?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Escreva em markdown... (Cole imagens diretamente com Ctrl+V)",
  className = "",
  disabled = false,
  rows = 6,
  preview = true
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [isUploadingFromPaste, setIsUploadingFromPaste] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const markdownComponents: Components = {
    img: ({node, src, alt, ...props}) => (
      <img 
        src={src} 
        alt={alt} 
        className="max-w-full h-auto rounded-md my-2" 
        {...props} 
      />
    ),
    ul: ({node, children, ...props}) => <ul className="list-disc pl-4 my-1" {...props}>{children}</ul>,
    ol: ({node, children, ...props}) => <ol className="list-decimal pl-4 my-1" {...props}>{children}</ol>,
    li: ({node, children, ...props}) => <li className="my-0" {...props}>{children}</li>,
    p: ({node, children, ...props}) => <p className="my-1" {...props}>{children}</p>,
    h1: ({node, children, ...props}) => <h1 className="text-lg font-bold my-2" {...props}>{children}</h1>,
    h2: ({node, children, ...props}) => <h2 className="text-md font-bold my-2" {...props}>{children}</h2>,
    h3: ({node, children, ...props}) => <h3 className="text-sm font-semibold my-1" {...props}>{children}</h3>,
    a: ({node, children, href, ...props}) => (
      <a href={href} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    ),
    code: ({node, className, children, ...props}) => {
      const match = /language-(\w+)/.exec(className || '');
      return !match ? (
        <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      ) : (
        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    }
  };

  const insertImageMarkdown = (markdown: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = value;
    
    const newValue = currentValue.substring(0, start) + '\n' + markdown + '\n' + currentValue.substring(end);
    onChange(newValue);
    
    // Set cursor position after the inserted markdown
    setTimeout(() => {
      const newPosition = start + markdown.length + 2;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Collect all image files
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') === 0) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    // If we have images, prevent default paste and upload them
    if (imageFiles.length > 0) {
      e.preventDefault();
      setIsUploadingFromPaste(true);
      setUploadingCount(imageFiles.length);
      
      try {
        const uploadPromises = imageFiles.map(async (file, index) => {
          const imageUrl = await uploadImage(file);
          const timestamp = new Date().toISOString().split('T')[0];
          const time = new Date().toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          return `![Imagem colada ${index + 1} - ${timestamp} ${time}](${imageUrl})`;
        });

        const markdownImages = await Promise.all(uploadPromises);
        const combinedMarkdown = markdownImages.join('\n\n');
        
        // Insert all images at cursor position
        insertImageMarkdown(combinedMarkdown);
        
      } catch (error) {
        console.error('Error uploading pasted images:', error);
        alert('Falha ao fazer upload de uma ou mais imagens. Tente novamente.');
      } finally {
        setIsUploadingFromPaste(false);
        setUploadingCount(0);
      }
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <ImageUploadButton
          onImageUploaded={() => {}}
          onImageMarkdown={insertImageMarkdown}
          disabled={disabled}
        />
        {preview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            {showPreview ? <Edit className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
        )}
      </div>

      {/* Editor/Preview */}
      {showPreview ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3 min-h-[150px] bg-gray-50 dark:bg-gray-800 overflow-auto">
          {value ? (
            <ReactMarkdown
              className="prose dark:prose-invert prose-sm max-w-none text-gray-900 dark:text-gray-100"
              components={markdownComponents}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <div className="text-gray-400 dark:text-gray-500 italic">Preview will appear here...</div>
          )}
        </div>
      ) : (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled || isUploadingFromPaste}
            rows={rows}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md resize-vertical focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          {isUploadingFromPaste && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center rounded-md">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
                {uploadingCount > 1 
                  ? `Fazendo upload de ${uploadingCount} imagens...`
                  : 'Fazendo upload da imagem...'
                }
              </div>
            </div>
          )}
        </div>
      )}


    </div>
  );
}; 