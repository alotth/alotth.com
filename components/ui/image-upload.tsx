import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { uploadImage } from '@/lib/supabase/storage';
import { ImageIcon, Upload, X } from 'lucide-react';

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string) => void;
  onImageMarkdown?: (markdown: string) => void;
  className?: string;
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUploaded,
  onImageMarkdown,
  className = '',
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await uploadImage(file);
      onImageUploaded(imageUrl);
      
      if (onImageMarkdown) {
        const filename = file.name.split('.')[0];
        const markdown = `![${filename}](${imageUrl})`;
        onImageMarkdown(markdown);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const openFileDialog = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || uploading}
      />
      
      <div
        onClick={openFileDialog}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all
          ${dragOver ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Click to upload</span> or drag and drop
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              PNG, JPG, GIF up to 10MB
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ImageUploadButtonProps {
  onImageUploaded: (imageUrl: string) => void;
  onImageMarkdown?: (markdown: string) => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  onImageUploaded,
  onImageMarkdown,
  variant = "outline",
  size = "sm",
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await uploadImage(file);
      onImageUploaded(imageUrl);
      
      if (onImageMarkdown) {
        const filename = file.name.split('.')[0];
        const markdown = `![${filename}](${imageUrl})`;
        onImageMarkdown(markdown);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const openFileDialog = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || uploading}
      />
      
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={openFileDialog}
        disabled={disabled || uploading}
        className="gap-2"
      >
        {uploading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
        {uploading ? 'Uploading...' : 'Add Image'}
      </Button>
    </>
  );
}; 