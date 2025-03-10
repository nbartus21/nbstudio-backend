import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  time: {
    type: String,
    required: true,
    enum: [
      '5 perccel előtte',
      '15 perccel előtte',
      '30 perccel előtte',
      '1 órával előtte',
      '2 órával előtte',
      '1 nappal előtte'
    ]
  },
  sent: {
    type: Boolean,
    default: false
  },
  scheduledTime: Date
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    required: true
  },
  reminders: [reminderSchema],
  createdBy: {
    type: String,
    required: true
  },
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Teljes szöveg keresés engedélyezése
taskSchema.index({ title: 'text', description: 'text' });

// Automatikus updatedAt frissítés
taskSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Emlékeztetők ütemezése
  if (this.reminders && this.reminders.length > 0) {
    this.reminders.forEach(reminder => {
      if (!reminder.scheduledTime && this.dueDate) {
        // Kiszámoljuk az emlékeztető tényleges idejét a határidőhöz képest
        const dueDate = new Date(this.dueDate);
        let reminderTime = new Date(dueDate);
        
        if (reminder.time === '5 perccel előtte') {
          reminderTime.setMinutes(reminderTime.getMinutes() - 5);
        } else if (reminder.time === '15 perccel előtte') {
          reminderTime.setMinutes(reminderTime.getMinutes() - 15);
        } else if (reminder.time === '30 perccel előtte') {
          reminderTime.setMinutes(reminderTime.getMinutes() - 30);
        } else if (reminder.time === '1 órával előtte') {
          reminderTime.setHours(reminderTime.getHours() - 1);
        } else if (reminder.time === '2 órával előtte') {
          reminderTime.setHours(reminderTime.getHours() - 2);
        } else if (reminder.time === '1 nappal előtte') {
          reminderTime.setDate(reminderTime.getDate() - 1);
        }
        
        reminder.scheduledTime = reminderTime;
      }
    });
  }
  
  next();
});

// Virtuális mező a késéshez
taskSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed') return false;
  
  const now = new Date();
  const dueDate = new Date(this.dueDate);
  return dueDate < now;
});

export default mongoose.model('Task', taskSchema);