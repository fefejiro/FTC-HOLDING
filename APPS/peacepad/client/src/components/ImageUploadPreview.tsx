import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, FileImage, Loader2, CheckCircle2, ArrowDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ImageUploadPreviewProps {
  file: File;
  previewUrl?: string;
  onRemove: () => void;
  onSend?: () => void;
  showSendButton?: boolean;
  compressImage?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  isCompressing: boolean;
  isComplete: boolean;
}

export function ImageUploadPreview({
  file,
  previewUrl,
  onRemove,
  onSend,
  showSendButton = false,
  compressImage = true,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.8,
}: ImageUploadPreviewProps) {
  const [compressionStats, setCompressionStats] = useState<CompressionStats>({
    originalSize: file.size,
    compressedSize: file.size,
    compressionRatio: 0,
    isCompressing: false,
    isComplete: false,
  });

  useEffect(() => {
    if (!compressImage || !file.type.startsWith('image/')) {
      setCompressionStats(prev => ({ ...prev, isComplete: true }));
      return;
    }

    setCompressionStats(prev => ({ ...prev, isCompressing: true }));

    const compressImageFile = async () => {
      try {
        const compressed = await performCompression(file, maxWidth, maxHeight, quality);
        const compressionRatio = ((file.size - compressed.size) / file.size) * 100;
        
        setCompressionStats({
          originalSize: file.size,
          compressedSize: compressed.size,
          compressionRatio,
          isCompressing: false,
          isComplete: true,
        });
      } catch (error) {
        console.error('Compression failed:', error);
        setCompressionStats(prev => ({
          ...prev,
          isCompressing: false,
          isComplete: true,
        }));
      }
    };

    compressImageFile();
  }, [file, compressImage, maxWidth, maxHeight, quality]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  return (
    <div className="p-4 bg-card border border-slate-200/70 dark:border-slate-700/70 rounded-xl shadow-md hover:shadow-lg space-y-3 transition-shadow" data-testid="image-upload-preview">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Preview attachment</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-auto p-1"
          data-testid="button-remove-preview"
          aria-label="Remove attachment"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        {/* Preview */}
        <div className="flex-shrink-0">
          {isImage && previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="h-20 w-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
            />
          ) : isVideo && previewUrl ? (
            <video
              src={previewUrl}
              className="h-20 w-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
              controls
            />
          ) : (
            <div className="h-20 w-20 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-muted shadow-sm">
              <FileImage className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-medium truncate">{file.name}</p>
          
          {/* Compression Status */}
          {isImage && compressImage && (
            <div className="space-y-1">
              {compressionStats.isCompressing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Compressing image...</p>
                </div>
              ) : compressionStats.isComplete && compressionStats.compressionRatio > 0 ? (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                    <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                      Compressed {compressionStats.compressionRatio.toFixed(0)}%
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{formatFileSize(compressionStats.originalSize)}</span>
                    <ArrowDown className="h-3 w-3" />
                    <span className="font-medium">{formatFileSize(compressionStats.compressedSize)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              )}
            </div>
          )}

          {!isImage && (
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </p>
          )}
        </div>

        {/* Send Button */}
        {showSendButton && onSend && (
          <Button
            size="sm"
            onClick={onSend}
            disabled={compressionStats.isCompressing}
            data-testid="button-send-attachment"
          >
            Send
          </Button>
        )}
      </div>

      {/* Compression Progress */}
      {isImage && compressImage && compressionStats.isCompressing && (
        <Progress value={50} className="h-1" />
      )}
    </div>
  );
}

async function performCompression(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          if (width > height) {
            width = maxWidth;
            height = maxWidth / aspectRatio;
          } else {
            height = maxHeight;
            width = maxHeight * aspectRatio;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
