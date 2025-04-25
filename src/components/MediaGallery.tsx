import React, { useState } from 'react';
import { FiTrash2, FiEdit2, FiMaximize2, FiMinimize2, FiX } from 'react-icons/fi';
import MediaPreview from './MediaPreview';
import MediaUploadComponent from './MediaUploadComponent';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Image, FileText, Video } from 'lucide-react';
import { MediaItem } from '@/hooks/useMediaUpload';
import useMediaUpload from '@/hooks/useMediaUpload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Media {
  id: string;
  step_id: string;
  url: string;
  type: 'image' | 'video' | 'document';
  caption?: string;
  created_at?: string;
  updated_at?: string;
  display_mode?: 'contain' | 'cover';
}

interface MediaGalleryProps {
  stepId: string;
  sopId: string;
  mediaItems: MediaItem[];
  onUploadMedia: (stepId: string, file: File) => Promise<any>;
  onDeleteMedia: (mediaId: string) => Promise<void>;
  onUpdateMedia: (mediaId: string, updates: Partial<Media>) => Promise<void>;
  className?: string;
  showUploader?: boolean;
  readOnly?: boolean;
  onMediaUpdated?: (updatedMedia: MediaItem) => void;
  onMediaDeleted?: (deletedMediaId: string) => void;
}

export default function MediaGallery({
  stepId,
  sopId,
  mediaItems,
  onUploadMedia,
  onDeleteMedia,
  onUpdateMedia,
  className = '',
  showUploader = true,
  readOnly = false,
  onMediaUpdated,
  onMediaDeleted
}: MediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [editedDisplayMode, setEditedDisplayMode] = useState('');

  const { updateMedia, deleteMedia, loading, error } = useMediaUpload({
    stepId,
    sopId,
    onSuccess: (media, action) => {
      if (action === 'update' && onMediaUpdated) {
        onMediaUpdated(media);
      } else if (action === 'delete' && onMediaDeleted && selectedMedia) {
        onMediaDeleted(selectedMedia.id);
      }
      setIsEditDialogOpen(false);
      setIsDeleteDialogOpen(false);
      setSelectedMedia(null);
    }
  });

  const handleEdit = (media: MediaItem) => {
    setSelectedMedia(media);
    setEditedCaption(media.caption || '');
    setEditedDisplayMode(media.display_mode || 'inline');
    setIsEditDialogOpen(true);
  };

  const handleView = (media: MediaItem) => {
    setSelectedMedia(media);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (media: MediaItem) => {
    setSelectedMedia(media);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMedia) return;
    
    await updateMedia({
      ...selectedMedia,
      caption: editedCaption,
      display_mode: editedDisplayMode as 'inline' | 'modal' | 'hidden'
    });
  };

  const handleConfirmDelete = async () => {
    if (!selectedMedia) return;
    await deleteMedia(selectedMedia.id);
  };

  const getMediaIcon = (mediaType: string) => {
    if (mediaType.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (mediaType.startsWith('video/')) return <Video className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const getMediaPreview = (media: MediaItem) => {
    if (media.type.startsWith('image/')) {
      return (
        <img 
          src={media.url} 
          alt={media.caption || 'Media preview'} 
          className="object-cover w-full h-32 rounded-md cursor-pointer"
          onClick={() => handleView(media)}
        />
      );
    }
    
    if (media.type.startsWith('video/')) {
      return (
        <video 
          src={media.url} 
          className="object-cover w-full h-32 rounded-md cursor-pointer"
          onClick={() => handleView(media)}
        />
      );
    }
    
    return (
      <div 
        className="flex items-center justify-center w-full h-32 bg-muted rounded-md cursor-pointer"
        onClick={() => handleView(media)}
      >
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Media Grid */}
      {mediaItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mediaItems.map((media) => (
            <Card key={media.id} className="overflow-hidden">
              <div className="relative">
                {getMediaPreview(media)}
                {!readOnly && (
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm"
                      onClick={() => handleEdit(media)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm"
                      onClick={() => handleDelete(media)}
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getMediaIcon(media.type)}
                    <span className="text-xs truncate max-w-[150px]">
                      {media.caption || 'No caption'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {media.display_mode || 'inline'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Upload Component */}
      {showUploader && (
        <MediaUploadComponent
          stepId={stepId}
          sopId={sopId}
          onUploadMedia={onUploadMedia}
          className="mt-4"
        />
      )}
      
      {/* View Media Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedMedia?.caption || 'Media Preview'}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {selectedMedia?.type.startsWith('image/') && (
              <img 
                src={selectedMedia.url} 
                alt={selectedMedia.caption || 'Media preview'} 
                className="max-h-[500px] object-contain"
              />
            )}
            {selectedMedia?.type.startsWith('video/') && (
              <video 
                src={selectedMedia.url} 
                controls
                className="max-h-[500px] w-full"
              />
            )}
            {selectedMedia?.type.startsWith('application/') && (
              <iframe 
                src={selectedMedia.url} 
                title={selectedMedia.caption || 'PDF document'} 
                className="w-full h-[500px]"
              />
            )}
          </div>
          {selectedMedia?.caption && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              {selectedMedia.caption}
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Media Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Media</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Input
                id="caption"
                value={editedCaption}
                onChange={(e) => setEditedCaption(e.target.value)}
                placeholder="Add a caption"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-mode">Display Mode</Label>
              <Select 
                value={editedDisplayMode} 
                onValueChange={setEditedDisplayMode}
              >
                <SelectTrigger id="display-mode">
                  <SelectValue placeholder="Select display mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inline">Inline</SelectItem>
                  <SelectItem value="modal">Modal</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleSaveEdit} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this media? This action cannot be undone.</p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Empty State */}
      {mediaItems.length === 0 && !showUploader && (
        <div className="text-center p-6 bg-slate-50 dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">No media attached to this step</p>
        </div>
      )}
    </div>
  );
} 