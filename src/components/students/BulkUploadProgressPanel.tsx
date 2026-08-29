import { useBulkUpload } from '@/contexts/BulkUploadContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, FileSpreadsheet, StopCircle, Ban } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const BulkUploadProgressPanel = () => {
  const { uploads, dismissUpload, cancelUpload } = useBulkUpload();
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedUpload, setExpandedUpload] = useState<string | null>(null);

  if (uploads.length === 0) return null;

  const activeUploads = uploads.filter(u => u.status === 'parsing' || u.status === 'uploading');
  const completedUploads = uploads.filter(u => u.status === 'completed' || u.status === 'error');

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <Card className="shadow-lg border-border bg-background">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Bulk Upload Progress
            {activeUploads.length > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {activeUploads.length} active
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="px-4 pb-4 pt-0">
            <ScrollArea className="max-h-80">
              <div className="space-y-3">
                {uploads.map((upload) => {
                  const progress = upload.totalRows > 0 
                    ? Math.round((upload.processedRows / upload.totalRows) * 100) 
                    : 0;
                  const isExpanded = expandedUpload === upload.id;

                  return (
                    <div
                      key={upload.id}
                      className={cn(
                        "border rounded-lg p-3 transition-colors",
                        upload.status === 'error' && "border-destructive/50 bg-destructive/5",
                        upload.status === 'completed' && "border-green-500/50 bg-green-500/5",
                        upload.status === 'cancelled' && "border-amber-500/50 bg-amber-500/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {upload.status === 'parsing' && (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            {upload.status === 'uploading' && (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            )}
                            {upload.status === 'completed' && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            {upload.status === 'error' && (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                            {upload.status === 'cancelled' && (
                              <Ban className="h-4 w-4 text-amber-500" />
                            )}
                            <span className="text-sm font-medium truncate">
                              {upload.fileName}
                            </span>
                          </div>

                          {(upload.status === 'parsing' || upload.status === 'uploading') && (
                            <div className="mt-2">
                              <Progress value={progress} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {upload.status === 'parsing' ? 'Parsing CSV...' : 
                                  `${upload.processedRows} of ${upload.totalRows} rows (${progress}%)`}
                              </p>
                            </div>
                          )}

                          {upload.status === 'completed' && (
                            <div className="mt-1">
                              <p className="text-xs text-muted-foreground">
                                <span className="text-green-600">{upload.successful} successful</span>
                                {upload.failed > 0 && (
                                  <span className="text-destructive"> • {upload.failed} failed</span>
                                )}
                              </p>
                            </div>
                          )}

                          {upload.status === 'cancelled' && (
                            <div className="mt-1">
                              <p className="text-xs text-amber-600">
                                Cancelled - {upload.successful} uploaded before cancellation
                                {upload.failed > 0 && (
                                  <span className="text-destructive"> • {upload.failed} failed</span>
                                )}
                              </p>
                            </div>
                          )}

                          {upload.status === 'error' && (
                            <p className="text-xs text-destructive mt-1">
                              {upload.errors[0]?.reason || 'An error occurred'}
                            </p>
                          )}

                          {upload.failed > 0 && (upload.status === 'completed' || upload.status === 'cancelled') && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs mt-1"
                              onClick={() => setExpandedUpload(isExpanded ? null : upload.id)}
                            >
                              {isExpanded ? 'Hide errors' : 'Show errors'}
                            </Button>
                          )}

                          {isExpanded && upload.errors.length > 0 && (
                            <div className="mt-2 bg-muted rounded p-2 text-xs max-h-32 overflow-auto">
                              {upload.errors.map((err, idx) => (
                                <div key={idx} className="mb-1 last:mb-0">
                                  <span className="font-medium">Row {err.row}:</span>{' '}
                                  {err.reason}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {(upload.status === 'parsing' || upload.status === 'uploading') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => cancelUpload(upload.id)}
                              title="Cancel upload"
                            >
                              <StopCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {(upload.status === 'completed' || upload.status === 'error' || upload.status === 'cancelled') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => dismissUpload(upload.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default BulkUploadProgressPanel;
