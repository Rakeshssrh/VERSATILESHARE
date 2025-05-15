import React, { useState, useEffect, useRef } from 'react';
import { FacultyResource } from '../../types/faculty';
import { FileText, Link as LinkIcon, MessageSquare, ThumbsUp, Video, Eye, Download, Bookmark } from 'lucide-react';
import { DocumentViewer } from '../document/DocumentViewer';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { trackResourceView, updateResourceViewCount } from '../../utils/studyUtils';
import { useAuth } from '../../contexts/AuthContext';
import { formatTimeAgo } from '../../utils/dateUtils';
import { useOutsideClick } from '../../hooks/useOutsideClick';

interface ResourceItemProps {
  resource: FacultyResource;
  source?: 'study-materials' | 'bookmarks' | 'placement' | 'other';
}

export const ResourceItem: React.FC<ResourceItemProps> = ({ resource, source = 'study-materials' }) => {
  const [showViewer, setShowViewer] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [viewCount, setViewCount] = useState(resource.stats?.views || 0);
  const [likesCount, setLikesCount] = useState(resource.stats?.likes || 0);
  const { user } = useAuth();
  const commentRef = useRef<HTMLDivElement>(null);
  
  // Ensure we have a valid resource ID
  const resourceId = resource.id || resource._id || '';

  // Use custom hook to detect clicks outside the comment section
  useOutsideClick(commentRef, () => {
    if (showComments) setShowComments(false);
  });

  // Check if the user has liked the resource on component mount
  useEffect(() => {
    if (user && resourceId) {
      const checkLikeStatus = async () => {
        try {
          const response = await api.get(`/api/resources/${resourceId}/like-status`);
          setIsLiked(response.data.isLiked);
        } catch (error) {
          console.error('Error checking like status:', error);
        }
      };
      
      checkLikeStatus();
    }
  }, [resourceId, user]);

  // Check if the user has bookmarked the resource
  useEffect(() => {
    const checkBookmarkStatus = async () => {
      if (!user || !resourceId) return;
      
      try {
        const response = await api.get(`/api/resources/${resourceId}/bookmark-status`);
        setIsBookmarked(response.data.isBookmarked);
      } catch (error) {
        console.error('Error checking bookmark status:', error);
      }
    };
    
    checkBookmarkStatus();
  }, [resourceId, user]);

  // Handle resource viewing
  const handleView = async () => {
    try {
      // Update local state immediately for responsive UI
      setViewCount(prev => prev + 1);
      
      // Track the view - this is important for analytics and activity feed
      const response = await trackResourceView(resourceId, source);
      
      // Update the resource view count in shared resources for other components
      if (response && response.views) {
        updateResourceViewCount(resourceId, response.views);
      }
      
      // Show the document viewer
      setShowViewer(true);
      
      // Log info for debugging
      console.log(`Viewed resource ${resource.title} from ${source}. New view count: ${viewCount + 1}`);
    } catch (error) {
      console.error('Error viewing resource:', error);
      // Still show the viewer even if tracking failed
      setShowViewer(true);
    }
  };

  // Get resource icon based on type
  const getResourceIcon = () => {
    switch (resource.type) {
      case 'document':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'video':
        return <Video className="h-5 w-5 text-red-500" />;
      case 'link':
        return <LinkIcon className="h-5 w-5 text-green-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  // Handle download
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the viewer
    e.preventDefault();
    
    // Implement download logic
    try {
      api.post(`/api/resources/${resourceId}/download`);
      window.open(resource.fileUrl, '_blank');
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download resource');
    }
  };

  // Handle like
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the viewer
    e.preventDefault();
    
    if (!user) {
      toast.error('Please log in to like resources');
      return;
    }
    
    try {
      api.post(`/api/resources/${resourceId}/like`)
        .then(response => {
          setIsLiked(response.data.isLiked);
          setLikesCount(prev => response.data.isLiked ? prev + 1 : prev - 1);
          toast.success(response.data.isLiked ? 'Resource liked' : 'Like removed');
        })
        .catch(error => {
          console.error('Like error:', error);
          toast.error('Failed to like resource');
        });
    } catch (error) {
      console.error('Like error:', error);
      toast.error('Failed to like resource');
    }
  };

  // Handle bookmark
  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the viewer
    e.preventDefault();
    
    try {
      api.post(`/api/resources/${resourceId}/bookmark`)
        .then(response => {
          setIsBookmarked(response.data.bookmarked);
          toast.success(response.data.bookmarked ? 'Resource bookmarked' : 'Bookmark removed');
        })
        .catch(error => {
          console.error('Bookmark error:', error);
          toast.error('Failed to bookmark resource');
        });
    } catch (error) {
      console.error('Bookmark error:', error);
      toast.error('Failed to bookmark resource');
    }
  };

  // Handle comment toggle
  const handleCommentToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the viewer
    e.preventDefault();
    setShowComments(!showComments);
    // Reset comment text when closing comment section
    if (showComments) {
      setCommentText('');
    }
  };

  // Handle comment submission
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent opening the viewer
    
    if (!commentText.trim()) return;
    
    try {
      api.post(`/api/resources/${resourceId}/comments`, { content: commentText })
        .then(() => {
          setCommentText('');
          toast.success('Comment added');
          // Close comment section after submission
          setShowComments(false);
        })
        .catch(error => {
          console.error('Comment error:', error);
          toast.error('Failed to add comment');
        });
    } catch (error) {
      console.error('Comment error:', error);
      toast.error('Failed to add comment');
    }
  };

  if (!resource) {
    return <div>Resource not found</div>;
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div 
        className="cursor-pointer"
        onClick={handleView}
      >
        <div className="flex items-start mb-3">
          <div className="mr-3 mt-1">
            {getResourceIcon()}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-800">{resource.title}</h3>
            {resource.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{resource.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center text-xs text-gray-500 mt-1 mb-3">
          <span>{formatTimeAgo(resource.createdAt || resource.uploadDate || '')}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center space-x-3">
          <div className="flex items-center text-gray-500 text-xs">
            <Eye className="h-3.5 w-3.5 mr-1" />
            <span>{viewCount}</span>
          </div>
          
          <button 
            className={`flex items-center ${isLiked ? 'text-red-500' : 'text-gray-500'} text-xs cursor-pointer hover:text-red-600`}
            onClick={handleLike}
          >
            <ThumbsUp className={`h-3.5 w-3.5 mr-1 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likesCount}</span>
          </button>
          
          <button 
            className="flex items-center text-gray-500 text-xs cursor-pointer hover:text-indigo-600"
            onClick={handleCommentToggle}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            <span>{resource.stats?.comments || 0}</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            className="p-1 rounded-full hover:bg-gray-100"
            onClick={handleBookmark}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current text-yellow-500' : 'text-gray-400 hover:text-gray-600'}`} />
          </button>
          
          <button
            className="p-1 rounded-full hover:bg-gray-100"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Comment section - only show when toggled for this specific resource */}
      {showComments && (
        <div 
          ref={commentRef}
          className="mt-3 pt-3 border-t border-gray-100"
          onClick={(e) => e.stopPropagation()} // Prevent opening viewer when clicking in comment area
        >
          <form className="mt-2" onSubmit={handleCommentSubmit}>
            <textarea
              className="w-full p-2 border border-gray-200 rounded-md text-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              rows={2}
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            ></textarea>
            <div className="text-right mt-1">
              <button
                type="submit"
                className="px-3 py-1 bg-indigo-600 text-white rounded-md text-xs hover:bg-indigo-700"
              >
                Comment
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Document viewer modal */}
      {showViewer && (
        <DocumentViewer
          fileUrl={resource.fileUrl || ''}
          fileName={resource.fileName || resource.title}
          onClose={() => setShowViewer(false)}
        />
      )}
    </div>
  );
};
