
import { useState, useEffect, useCallback } from 'react';
import { FileText, Video, Link as LinkIcon, File, Download, Calendar, Eye, Bookmark, ThumbsUp, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { DocumentViewer } from '../document/DocumentViewer';
import { useAuth } from '../../contexts/AuthContext';
import { activityService } from '../../services/activity.service';

interface ResourceCardProps {
  resource: any;
  onViewCountUpdated?: (resourceId: string, newCount: number) => void;
  compact?: boolean;
}

// Object mapping resource types to their respective icons
const resourceTypeIcons = {
  document: FileText,
  video: Video,
  link: LinkIcon,
  note: File,
  pdf: FileText
};

export const ResourceCard = ({ resource, onViewCountUpdated }: ResourceCardProps) => {
  const ResourceIcon = resourceTypeIcons[resource.type as keyof typeof resourceTypeIcons] || File;
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDocViewer, setShowDocViewer] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [viewCount, setViewCount] = useState<number>(resource.stats?.views || 0);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const { user } = useAuth();
  
  // Function to update the view count in UI instantly 
  const updateLocalViewCount = useCallback(async (resourceId: string) => {
    try {
      console.log(`Updating view count for ${resourceId}`);
      const result = await activityService.incrementResourceView(resourceId);
      
      if (result.success && result.views !== undefined) {
        console.log(`View count updated successfully to ${result.views}`);
        // Update local state
        setViewCount(result.views);
        
        // Update resource object
        if (resource.stats) {
          resource.stats.views = result.views;
        } else {
          resource.stats = { views: result.views };
        }
        
        // Call the callback if provided
        if (onViewCountUpdated) {
          onViewCountUpdated(resourceId, result.views);
        }
        
        console.log(`View count updated for ${resource.title}: ${result.views}`);
        return result.views;
      }
    } catch (error) {
      console.error(`Error updating view count: ${error}`);
    }
    return null;
  }, [resource, onViewCountUpdated]);
  
  useEffect(() => {
    // Initialize view count from resource
    if (resource?.stats?.views !== undefined) {
      setViewCount(resource.stats.views);
    }
  }, [resource]);
  
  useEffect(() => {
    // Check if this resource is bookmarked
    const checkBookmarkStatus = async () => {
      if (!user || !resource.id) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/resources/${resource.id}/bookmark-status`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsBookmarked(data.isBookmarked);
        }
      } catch (error) {
        console.error('Failed to check bookmark status:', error);
      }
    };
    
    checkBookmarkStatus();
  }, [resource.id, user]);
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } catch (e) {
      return 'N/A';
    }
  };
  
  // Update stats
  const updateStats = async (resourceId: string, action: 'download' | 'bookmark' | 'like' | 'comment') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch('/api/resources/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ resourceId, action })
      });
      
      if (!response.ok) {
        console.error(`Failed to update ${action} stats`);
      }
    } catch (error) {
      console.error(`Error updating stats: ${error}`);
    }
  };
  
  // Handle view document button click
  const handleViewDocument = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default behavior
    e.stopPropagation(); // Prevent card click
    
    // Get resource ID, trying both _id and id fields
    const resourceId = resource._id || resource.id;
    if (!resourceId) {
      toast.error('Invalid resource ID');
      return;
    }
    
    if (resource.fileUrl) {
      // Count view and update immediately
      const updatedCount = await updateLocalViewCount(resourceId);
      if (updatedCount !== null) {
        setViewCount(updatedCount);
        
        // Log view activity to ensure it appears in recent activities
        if (user) {
          await activityService.logActivity({
            type: 'view',
            resourceId,
            message: `Viewed resource: ${resource.title}`
          });
        }
      }
      
      // Show document viewer
      setShowDocViewer(true);
    } else if (resource.type === 'link' && resource.link) {
      // For links, count view and open in new tab
      const updatedCount = await updateLocalViewCount(resourceId);
      if (updatedCount !== null) {
        setViewCount(updatedCount);
        
        // Log view activity
        if (user) {
          await activityService.logActivity({
            type: 'view',
            resourceId,
            message: `Viewed link: ${resource.title}`
          });
        }
      }
      
      window.open(resource.link, '_blank');
    } else {
      toast.error('No content available to view');
    }
  };
  
  // Handle download button click
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default behavior
    e.stopPropagation(); // Prevent card click
    
    setIsDownloading(true);
    
    try {
      const resourceId = resource._id || resource.id;
      
      // Update view count and stats
      if (resourceId) {
        const updatedCount = await updateLocalViewCount(resourceId);
        if (updatedCount !== null) setViewCount(updatedCount);
        await updateStats(resourceId, 'download');
        
        // Log download activity
        await activityService.logActivity({
          type: 'download',
          resourceId,
          message: `Downloaded: ${resource.title}`
        });
      }
      
      if (resource.fileUrl) {
        // Direct download without opening viewer
        const a = document.createElement('a');
        a.href = resource.fileUrl;
        a.download = resource.fileName || resource.title || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (resource.type === 'link' && resource.link) {
        // If it's a link resource, open the link
        window.open(resource.link, '_blank');
      } else {
        toast.error('No file or link available for download');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download resource');
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Handle bookmark toggle
  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default behavior
    e.stopPropagation(); // Prevent card click
    
    if (!user) {
      toast.error('Please log in to bookmark resources');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const resourceId = resource.id || resource._id;
      const response = await fetch(`/api/resources/${resourceId}/bookmark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to update bookmark status');
      }
      
      const data = await response.json();
      
      // Toggle bookmark state
      setIsBookmarked(data.bookmarked);
      
      // Update stats
      if (resourceId) {
        await updateStats(resourceId, 'bookmark');
      }
      
      toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
    } catch (error) {
      console.error('Bookmark error:', error);
      toast.error('Failed to update bookmark status');
    }
  };

  // Handle adding a comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please log in to add comments');
      return;
    }
    
    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    
    try {
      const resourceId = resource._id || resource.id;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/resources/${resourceId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: commentText })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add comment');
      }
      
      const data = await response.json();
      
      // Update resource with new comment
      if (!resource.comments) {
        resource.comments = [];
      }
      
      resource.comments.push(data.comment);
      
      // Update stats
      if (resource.stats) {
        resource.stats.comments = (resource.stats.comments || 0) + 1;
      }
      
      // Clear comment text
      setCommentText('');
      
      // Update stats in the backend
      await updateStats(resourceId, 'comment');
      
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Comment error:', error);
      toast.error('Failed to add comment');
    }
  };

  // Toggle comment section
  const toggleComments = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowComments(!showComments);
  };

  // Handle card click to view document
  const handleCardClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default behavior
    
    // Same as handleViewDocument but without stopPropagation
    const resourceId = resource._id || resource.id;
    if (!resourceId) {
      toast.error('Invalid resource ID');
      return;
    }
    
    if (resource.fileUrl) {
      // Count view and update immediately
      const updatedCount = await updateLocalViewCount(resourceId);
      if (updatedCount !== null) {
        setViewCount(updatedCount);
        
        // Log view activity to ensure it appears in recent activities
        if (user) {
          await activityService.logActivity({
            type: 'view',
            resourceId,
            message: `Viewed resource: ${resource.title}`
          });
        }
      }
      
      // Show document viewer
      setShowDocViewer(true);
    } else if (resource.type === 'link' && resource.link) {
      // For links, count view and open in new tab
      const updatedCount = await updateLocalViewCount(resourceId);
      if (updatedCount !== null) {
        setViewCount(updatedCount);
        
        // Log view activity
        if (user) {
          await activityService.logActivity({
            type: 'view',
            resourceId,
            message: `Viewed link: ${resource.title}`
          });
        }
      }
      
      window.open(resource.link, '_blank');
    } else {
      toast.error('No content available to view');
    }
  };
  
  // Handle close document viewer
  const handleCloseDocViewer = () => {
    setShowDocViewer(false);
  };
  
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:border-indigo-200 hover:shadow-lg transition-all h-full flex flex-col cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="p-4 flex-1">
        <div className="flex items-start">
          <div className="bg-indigo-100 p-2 rounded-lg mr-3">
            <ResourceIcon className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-800 mb-1 line-clamp-2">
              {resource.title}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-2 mb-2">
              {resource.description}
            </p>
            <div className="flex items-center mt-3 text-xs text-gray-500">
              <span className="capitalize mr-3">{resource.type}</span>
              <span className="mr-3">•</span>
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                <span>{formatDate(resource.createdAt || resource.uploadDate || resource.timestamp || new Date().toISOString())}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-t border-gray-100">
        <div className="flex items-center text-xs text-gray-500">
          <Eye className="h-3 w-3 mr-1" />
          <span>{viewCount} views</span>
          
          {resource.stats?.likes > 0 && (
            <>
              <span className="mx-1">•</span>
              <ThumbsUp className="h-3 w-3 mr-1" />
              <span>{resource.stats.likes} likes</span>
            </>
          )}
          
          {resource.stats?.comments > 0 && (
            <>
              <span className="mx-1">•</span>
              <MessageSquare className="h-3 w-3 mr-1" />
              <span>{resource.stats.comments} comments</span>
            </>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button 
            onClick={handleViewDocument}
            className="text-indigo-600 hover:text-indigo-800 transition-colors"
            title="View document"
          >
            <Eye className="h-4 w-4" />
          </button>
          
          <button 
            onClick={handleDownload}
            className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            title="Download"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
            ) : (
              <Download className="h-4 w-4" />
            )}
          </button>
          
          <button
            onClick={handleBookmark}
            className={`${isBookmarked ? 'text-yellow-600' : 'text-gray-600'} hover:text-yellow-600`}
            title={isBookmarked ? "Remove bookmark" : "Bookmark"}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-yellow-500' : ''}`} />
          </button>
          
          <button 
            onClick={toggleComments}
            className={`${showComments ? 'text-indigo-600' : 'text-gray-600'} hover:text-indigo-600`}
            title="Comments"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {showComments && (
        <div className="px-4 py-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
          <h4 className="font-medium text-sm mb-2">Comments</h4>
          
          {resource.comments && resource.comments.length > 0 ? (
            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
              {resource.comments.map((comment: any, index: number) => (
                <div key={comment._id || index} className="text-sm p-2 bg-gray-50 rounded">
                  <div className="font-medium text-xs text-gray-700">
                    {comment.author?.name || "User"} • {formatDate(comment.createdAt)}
                  </div>
                  <div className="text-gray-700 mt-1">{comment.content}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-2">No comments yet</p>
          )}
          
          <form onSubmit={handleAddComment} className="flex">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-l focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-3 py-1 text-sm rounded-r hover:bg-indigo-700"
            >
              Post
            </button>
          </form>
        </div>
      )}
      
      {showDocViewer && (
        <DocumentViewer 
          fileUrl={resource.fileUrl} 
          fileName={resource.fileName || resource.title} 
          onClose={handleCloseDocViewer} 
        />
      )}
    </motion.div>
  );
};
