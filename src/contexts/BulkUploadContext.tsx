import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { BulkUploadResult } from '@/types';

interface BulkUploadProgress {
  id: string;
  fileName: string;
  totalRows: number;
  processedRows: number;
  successful: number;
  failed: number;
  status: 'parsing' | 'uploading' | 'completed' | 'error' | 'cancelled';
  errors: Array<{
    row: number;
    reason: string;
    data: { admissionNo?: string; name?: string; email?: string };
  }>;
  startedAt: Date;
  completedAt?: Date;
}

interface BulkUploadContextType {
  uploads: BulkUploadProgress[];
  startUpload: (id: string, fileName: string, totalRows: number) => void;
  updateProgress: (id: string, updates: Partial<BulkUploadProgress>) => void;
  completeUpload: (id: string, result: BulkUploadResult) => void;
  setUploadError: (id: string, error: string) => void;
  dismissUpload: (id: string) => void;
  cancelUpload: (id: string) => void;
  isCancelled: (id: string) => boolean;
  hasActiveUploads: boolean;
}

const BulkUploadContext = createContext<BulkUploadContextType | undefined>(undefined);

export const BulkUploadProvider = ({ children }: { children: ReactNode }) => {
  const [uploads, setUploads] = useState<BulkUploadProgress[]>([]);
  const cancelledUploadsRef = useRef<Set<string>>(new Set());

  const startUpload = useCallback((id: string, fileName: string, totalRows: number) => {
    cancelledUploadsRef.current.delete(id);
    setUploads(prev => [
      ...prev,
      {
        id,
        fileName,
        totalRows,
        processedRows: 0,
        successful: 0,
        failed: 0,
        status: 'parsing',
        errors: [],
        startedAt: new Date(),
      },
    ]);
  }, []);

  const updateProgress = useCallback((id: string, updates: Partial<BulkUploadProgress>) => {
    setUploads(prev =>
      prev.map(upload =>
        upload.id === id ? { ...upload, ...updates } : upload
      )
    );
  }, []);

  const completeUpload = useCallback((id: string, result: BulkUploadResult) => {
    setUploads(prev =>
      prev.map(upload =>
        upload.id === id
          ? {
              ...upload,
              status: 'completed' as const,
              successful: result.successful,
              failed: result.failed,
              errors: result.errors,
              completedAt: new Date(),
            }
          : upload
      )
    );
    cancelledUploadsRef.current.delete(id);
  }, []);

  const setUploadError = useCallback((id: string, error: string) => {
    setUploads(prev =>
      prev.map(upload =>
        upload.id === id
          ? {
              ...upload,
              status: 'error' as const,
              errors: [{ row: 0, reason: error, data: {} }],
              completedAt: new Date(),
            }
          : upload
      )
    );
    cancelledUploadsRef.current.delete(id);
  }, []);

  const cancelUpload = useCallback((id: string) => {
    cancelledUploadsRef.current.add(id);
    setUploads(prev =>
      prev.map(upload =>
        upload.id === id && (upload.status === 'parsing' || upload.status === 'uploading')
          ? {
              ...upload,
              status: 'cancelled' as const,
              completedAt: new Date(),
            }
          : upload
      )
    );
  }, []);

  const isCancelled = useCallback((id: string) => {
    return cancelledUploadsRef.current.has(id);
  }, []);

  const dismissUpload = useCallback((id: string) => {
    cancelledUploadsRef.current.delete(id);
    setUploads(prev => prev.filter(upload => upload.id !== id));
  }, []);

  const hasActiveUploads = uploads.some(
    u => u.status === 'parsing' || u.status === 'uploading'
  );

  return (
    <BulkUploadContext.Provider
      value={{
        uploads,
        startUpload,
        updateProgress,
        completeUpload,
        setUploadError,
        dismissUpload,
        cancelUpload,
        isCancelled,
        hasActiveUploads,
      }}
    >
      {children}
    </BulkUploadContext.Provider>
  );
};

export const useBulkUpload = () => {
  const context = useContext(BulkUploadContext);
  if (context === undefined) {
    throw new Error('useBulkUpload must be used within a BulkUploadProvider');
  }
  return context;
};
