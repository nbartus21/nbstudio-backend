import mongoose from 'mongoose';

// Frissítés (update) séma a feladatok állapotának követéséhez
const taskUpdateSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Fő feladat séma
const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  dueDate: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  updates: [taskUpdateSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  userId: {
    type: String // A felhasználó azonosító, aki létrehozta a feladatot
  }
}, {
  timestamps: true
});

// Indexek a hatékony kereséshez
taskSchema.index({ status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ userId: 1 });

// Automatikus frissítés middleware
taskSchema.pre('save', function(next) {
  // Ha a státuszt most állítjuk 'completed'-re, állítsuk be a completedAt mezőt
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
    this.progress = 100;
  }
  
  // Ha a progress 100%, de a státusz nem completed, állítsuk át
  if (this.progress === 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  next();
});

export default mongoose.model('Task', taskSchema);