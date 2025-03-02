import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['cpu', 'memory', 'disk', 'security', 'service', 'network', 'other'],
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning'
  },
  message: {
    type: String,
    required: true
  },
  acknowledged: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const historyEntrySchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  cpu_usage: Number,
  memory_usage: Number,
  disk_usage: Number,
  load_average: [Number],
  network_latency: Number,
  network_traffic: {
    rx_bytes: Number,
    tx_bytes: Number
  }
});

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
  ip_address: String,
  os: {
    type: String,
    default: 'Unknown'
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance', 'warning', 'critical'],
    default: 'offline'
  },
  registration_time: {
    type: Date,
    default: Date.now
  },
  last_seen: {
    type: Date,
    default: Date.now
  },
  system_info: {
    os_details: {
      distribution: String,
      version: String,
      kernel: String
    },
    cpu: {
      model: String,
      cores: Number,
      load_average: [Number],
      usage_percent: Number
    },
    memory: {
      total: Number,      // MB
      used: Number,       // MB
      free: Number,       // MB
      usage_percent: Number
    },
    disk: {
      total: Number,      // GB
      used: Number,       // GB
      free: Number,       // GB
      usage_percent: Number,
      mounts: [{
        mountpoint: String,
        size: Number,     // GB
        used: Number,     // GB
        usage_percent: Number
      }]
    },
    processes: {
      total: Number,
      running: Number,
      sleeping: Number,
      stopped: Number,
      zombie: Number
    },
    uptime: Number        // másodperc
  },
  services: [{
    name: String,
    status: String,
    port: Number,
    process_id: Number,
    memory_usage: Number,  // MB
    cpu_usage: Number      // %
  }],
  network: {
    interfaces: [{
      name: String,
      ip_address: String,
      mac_address: String,
      rx_bytes: Number,
      tx_bytes: Number,
      rx_errors: Number,
      tx_errors: Number
    }],
    connections: {
      established: Number,
      time_wait: Number,
      close_wait: Number
    },
    speedtest: {
      download: Number,    // Mbps
      upload: Number,      // Mbps
      ping: Number,        // ms
      server: String,
      timestamp: Date
    },
    ping_results: [{
      host: String,
      min: Number,
      avg: Number,
      max: Number,
      packet_loss: Number
    }]
  },
  security: {
    open_ports: [Number],
    active_ssh_connections: Number,
    failed_login_attempts: [{
      user: String,
      ip: String,
      timestamp: Date
    }],
    updates_available: Number,
    security_updates: Number,
    last_security_check: Date
  },
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
  alerts: [alertSchema],
  history: [historyEntrySchema]
}, {
  timestamps: true
});

// Aktív riasztások lekérdezése
serverMonitorSchema.virtual('active_alerts').get(function() {
  return this.alerts.filter(alert => !alert.acknowledged);
});

// Szerver online-e az utolsó 5 percben
serverMonitorSchema.virtual('is_online').get(function() {
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
  return this.last_seen > fiveMinutesAgo;
});

// Állapot lekérdezése az aktív riasztások alapján
serverMonitorSchema.pre('save', function(next) {
  // Biztosítsuk, hogy van-e már aktív riasztás
  if (!this.alerts) {
    this.alerts = [];
  }
  
  // Ellenőrizzük a szervert online-e
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
  
  if (this.last_seen < fiveMinutesAgo) {
    this.status = 'offline';
    
    // Nincs-e már offline riasztás
    const existingOfflineAlert = this.alerts.find(alert => 
      alert.type === 'other' && 
      alert.message.includes('offline') &&
      !alert.acknowledged
    );
    
    if (!existingOfflineAlert) {
      this.alerts.push({
        type: 'other',
        severity: 'critical',
        message: 'A szerver offline állapotban van',
        timestamp: new Date()
      });
    }
  } else {
    // Online esetén a riasztások alapján állítsuk be az állapotot
    const criticalAlerts = this.alerts.filter(alert => 
      !alert.acknowledged && alert.severity === 'critical'
    );
    
    const warningAlerts = this.alerts.filter(alert => 
      !alert.acknowledged && alert.severity === 'warning'
    );
    
    if (criticalAlerts.length > 0) {
      this.status = 'critical';
    } else if (warningAlerts.length > 0) {
      this.status = 'warning';
    } else {
      this.status = 'online';
    }
  }
  
  next();
});

const ServerMonitor = mongoose.model('ServerMonitor', serverMonitorSchema);

export default ServerMonitor;