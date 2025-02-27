import mongoose from 'mongoose';

const serverMonitorSchema = new mongoose.Schema({
  server_id: { 
    type: String, 
    required: true,
    unique: true
  },
  hostname: { 
    type: String, 
    required: true 
  },
  os: String,
  ip_address: String,
  status: {
    type: String,
    enum: ['online', 'offline', 'warning', 'maintenance'],
    default: 'online'
  },
  uptime: String,
  last_seen: { 
    type: Date, 
    default: Date.now 
  },
  registration_time: Date,
  system_info: {
    cpu: {
      model: String,
      cores: Number,
      usage_percent: Number,
      load: String
    },
    memory: {
      total_mb: Number,
      used_mb: Number,
      free_mb: Number,
      usage_percent: Number
    },
    swap: {
      total_mb: Number,
      used_mb: Number
    },
    disk: {
      total: String,
      used: String,
      free: String,
      usage_percent: Number,
      io_latency_ms: String,
      disks_detail: mongoose.Schema.Types.Mixed
    }
  },
  network: {
    interfaces: [mongoose.Schema.Types.Mixed],
    speedtest: {
      download: Number,
      upload: Number,
      ping: Number,
      server: {
        host: String,
        location: String
      },
      timestamp: Date
    },
    ping_results: mongoose.Schema.Types.Mixed
  },
  security: {
    open_ports: [String],
    active_ssh_connections: Number,
    failed_login_attempts: [String],
    updates_available: String,
    security_updates: String,
    last_security_check: Date
  },
  services: [String],
  alerts: [{
    type: {
      type: String,
      enum: ['cpu', 'memory', 'disk', 'network', 'security', 'service'],
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info'
    },
    message: String,
    timestamp: { 
      type: Date, 
      default: Date.now 
    },
    acknowledged: {
      type: Boolean,
      default: false
    }
  }],
  history: [{
    timestamp: { 
      type: Date, 
      default: Date.now 
    },
    cpu_usage: Number,
    memory_usage: Number,
    disk_usage: Number,
    network_latency: Number
  }],
  settings: {
    alert_cpu_threshold: {
      type: Number,
      default: 90
    },
    alert_memory_threshold: {
      type: Number,
      default: 90
    },
    alert_disk_threshold: {
      type: Number,
      default: 90
    },
    monitored_services: [String],
    notification_email: String,
    collection_interval: {
      type: Number,
      default: 60
    }
  },
  notes: String,
  tags: [String],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Automatikus frissítési dátum
serverMonitorSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual mező a teljes státusz állapotához
serverMonitorSchema.virtual('healthStatus').get(function() {
  if (this.status === 'offline' || this.status === 'maintenance') {
    return this.status;
  }
  
  const criticalAlerts = this.alerts.filter(alert => 
    alert.severity === 'critical' && !alert.acknowledged
  ).length;
  
  if (criticalAlerts > 0) {
    return 'critical';
  }
  
  const warningAlerts = this.alerts.filter(alert => 
    alert.severity === 'warning' && !alert.acknowledged
  ).length;
  
  if (warningAlerts > 0) {
    return 'warning';
  }
  
  return 'healthy';
});

// Metrikus számítás a rendszer egészségügyi állapotához (0-100%)
serverMonitorSchema.virtual('healthScore').get(function() {
  if (this.status === 'offline') return 0;
  if (this.status === 'maintenance') return 50;
  
  // Alap pontszám 100
  let score = 100;
  
  // CPU használat levonás (max 30 pont)
  if (this.system_info?.cpu?.usage_percent > 0) {
    score -= Math.min(30, (this.system_info.cpu.usage_percent / 100) * 30);
  }
  
  // Memória használat levonás (max 30 pont)
  if (this.system_info?.memory?.usage_percent > 0) {
    score -= Math.min(30, (this.system_info.memory.usage_percent / 100) * 30);
  }
  
  // Lemez használat levonás (max 20 pont)
  if (this.system_info?.disk?.usage_percent > 0) {
    score -= Math.min(20, (this.system_info.disk.usage_percent / 100) * 20);
  }
  
  // Aktív figyelmeztetések levonás (max 20 pont)
  const activeAlerts = this.alerts.filter(alert => !alert.acknowledged).length;
  score -= Math.min(20, activeAlerts * 5);
  
  return Math.max(0, Math.round(score));
});

// Index definiálása a szerver ID-ra
serverMonitorSchema.index({ server_id: 1 }, { unique: true });
serverMonitorSchema.index({ status: 1 });
serverMonitorSchema.index({ last_seen: 1 });
serverMonitorSchema.index({ 'alerts.severity': 1, 'alerts.acknowledged': 1 });

export default mongoose.model('ServerMonitor', serverMonitorSchema);