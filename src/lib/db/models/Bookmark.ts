
import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure uniqueness for user-resource combination
bookmarkSchema.index({ userId: 1, resourceId: 1 }, { unique: true });

// Static methods
bookmarkSchema.statics.getBookmarkedResources = async function(userId) {
  return this.find({ userId }).populate('resourceId').sort({ createdAt: -1 });
};

bookmarkSchema.statics.isBookmarked = async function(userId, resourceId) {
  const bookmark = await this.findOne({ userId, resourceId });
  return !!bookmark;
};

bookmarkSchema.statics.toggleBookmark = async function(userId, resourceId) {
  try {
    // Convert string IDs to ObjectIDs if they aren't already
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const resourceObjectId = typeof resourceId === 'string' ? new mongoose.Types.ObjectId(resourceId) : resourceId;
    
    // Check if bookmark exists
    const bookmark = await this.findOne({ 
      userId: userObjectId, 
      resourceId: resourceObjectId 
    });
    
    if (bookmark) {
      // If bookmark exists, remove it
      await this.deleteOne({ 
        userId: userObjectId, 
        resourceId: resourceObjectId 
      });
      return { bookmarked: false };
    } else {
      // If bookmark doesn't exist, create it
      await this.create({ 
        userId: userObjectId, 
        resourceId: resourceObjectId 
      });
      return { bookmarked: true };
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    throw error;
  }
};

// Safety check for model definition
const BookmarkModel = mongoose.models.Bookmark || mongoose.model('Bookmark', bookmarkSchema);

export interface IBookmark {
  _id?: string;
  userId: string;
  resourceId: string;
  createdAt: Date | string;
}

export { BookmarkModel as Bookmark };
