
//src\lib\db\models\Resource.ts
import mongoose from 'mongoose';
import { getAllCategoryIds, getStandardizedCategory } from '../../../utils/placementCategoryUtils';

// Define a daily view schema for statistics
const DailyViewSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  count: {
    type: Number,
    default: 0
  }
});

// Define student feedback schema
const StudentFeedbackSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  count: {
    type: Number,
    default: 0
  }
});

// Define stats schema
const StatsSchema = new mongoose.Schema({
  views: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  lastViewed: {
    type: Date,
    default: Date.now
  },
  dailyViews: [DailyViewSchema],
  studentFeedback: [StudentFeedbackSchema]
});

// Define the Resource schema
const ResourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    required: true,
    enum: ['document', 'video', 'note', 'link'],
    default: 'document'
  },
  subject: {
    type: String,
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 0,
    max: 8
  },
  department: {
    type: String,
    required: false,
    default: 'Common'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  fileUrl: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    default: 0
  },
  link: {
    type: String,
    default: null
  },
  stats: {
    type: StatsSchema,
    default: () => ({})
  },
  category: {
    type: String,
    enum: ['study', 'placement', 'common'],
    default: 'study'
  },
  placementCategory: {
    type: String,
    enum: getAllCategoryIds(),
    default: 'general'
  },
  tags: [{
    type: String
  }],
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    content: {
      type: String,
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    default: null
  }
});

// Pre-save middleware
ResourceSchema.pre('save', function(next) {
  // Update the updatedAt field
  this.updatedAt = new Date();
  
  // If it's a placement resource, ensure semester is set to 0
  if (this.category === 'placement' && this.semester !== 0) {
    this.semester = 0;
  }
  
  // Before saving, make sure placementCategory is standardized
  if (this.category === 'placement' && this.placementCategory) {
    this.placementCategory = getStandardizedCategory(this.placementCategory);
  }
  
  // Initialize stats if they don't exist
  if (!this.stats) {
    this.stats = {
      views: 0,
      downloads: 0,
      likes: 0,
      comments: 0,
      lastViewed: new Date(),
      dailyViews: new mongoose.Types.DocumentArray([]),
      studentFeedback: new mongoose.Types.DocumentArray([])
    };
  }
  
  // Initialize arrays if they don't exist
  if (!this.likedBy) this.likedBy = [];
  if (!this.comments) this.comments = new mongoose.Types.DocumentArray([]);
  if (!this.tags) this.tags = [];
  if (!this.stats.dailyViews) this.stats.dailyViews = new mongoose.Types.DocumentArray([]);
  if (!this.stats.studentFeedback) this.stats.studentFeedback = new mongoose.Types.DocumentArray([]);
  
  next();
});

// Add method for soft deletion
ResourceSchema.methods.softDelete = async function() {
  this.deletedAt = new Date();
  await this.save();
  return this;
};

// Add method for restoration
ResourceSchema.methods.restore = async function() {
  this.deletedAt = null;
  await this.save();
  return this;
};

// Update find operations to exclude soft-deleted items by default
ResourceSchema.pre('find', function() {
  // @ts-ignore - this condition is valid for mongoose queries
  if (!this.getQuery().includeSoftDeleted) {
    this.where({ deletedAt: null });
  } else {
    // @ts-ignore - this is a custom property we're using
    delete this.getQuery().includeSoftDeleted;
  }
});

ResourceSchema.pre('findOne', function() {
  // @ts-ignore - this condition is valid for mongoose queries
  if (!this.getQuery().includeSoftDeleted) {
    this.where({ deletedAt: null });
  } else {
    // @ts-ignore - this is a custom property we're using
    delete this.getQuery().includeSoftDeleted;
  }
});

// Define a virtual for a user-friendly ID
ResourceSchema.virtual('id').get(function() {
  return this._id.toString();
});

// Configure the schema to include virtuals when converting to JSON
ResourceSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret.__v;
    return ret;
  }
});

// Safe export pattern for Next.js and Mongoose
let Resource:any;

try {
  // Check if the model already exists to prevent recompilation
  Resource = mongoose.models.Resource || mongoose.model('Resource', ResourceSchema);
} catch (error) {
  // If model doesn't exist yet, create it
  Resource = mongoose.model('Resource', ResourceSchema);
}

export { Resource };
