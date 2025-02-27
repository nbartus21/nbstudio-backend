import express from 'express';
import ServerMonitor from '../models/ServerMonitor.js';
import Notification from '../models/Notification.js';
import dotenv from 'dotenv';
import authMiddleware from '../middleware/auth.js';

dotenv.config();
const router = express.Router();

// API kulcs ellenőrzése a monitorozó szerverektől érkező kérésekhez
const validateMonitorApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!process.env.MONITOR_API_KEY) {
    return res.status(500).json({ message: 'A monitorozó API kulcs nincs beállítva a szerveren' });
  }
  
  if (!apiKey) {
    return res.status(401).json({ message: 'API kulcs szükséges' });
  }

  if (apiKey === process.env.MONITOR_API_KEY) {
    next();
  } else {
    res.status(401).json({ message: 'Érvénytelen API kulcs' });
  }
};

// Publikus végpontok a szerverektől érkező adatokhoz
// Szerver regisztráció
router.post('/register', validateMonitorApiKey, async (req, res) => {
  try {
    const { server_id, hostname, os, ip_address, registration_time } = req.body;
    
    // Szerver keresése az adatbázisban
    let server = await ServerMonitor.findOne({ server_id });
    
    if (server) {
      // Meglévő szerver frissítése
      server.hostname = hostname;
      server.os = os;
      server.ip_address = ip_address;
      server.last_seen = new Date();
      server.status = 'online';
      
      await server.save();
      
      return res.status(200).json({
        success: true, 
        message: 'Szerver frissítve', 
        server_id
      });
    } else {
      // Új szerver létrehozása
      server = new ServerMonitor({
        server_id,
        hostname,
        os,
        ip_address,
        registration_time: registration_time || new Date(),
        status: 'online',
        last_seen: new Date()
      });
      
      await server.save();
      
      // Rendszergazda értesítése
      const notification = new Notification({
        userId: process.env.ADMIN_EMAIL || 'admin@example.com',
        type: 'server',
        title: 'Új szerver regisztrálva',
        message: `Új szerver csatlakozott a rendszerhez: ${hostname} (${ip_address})`,
        severity: 'info',
        link: '/infrastructure/monitoring'
      });
      
      await notification.save();
      
      return res.status(201).json({
        success: true, 
        message: 'Szerver sikeresen regisztrálva', 
        server_id
      });
    }
  } catch (error) {
    console.error('Hiba a rendszer információk frissítésekor:', error);
    res.status(500).json({ 
      success: false,
      message: 'Szerver hiba az adatok mentése során', 
      error: error.message 
    });
  }
});

// Rendszerinformációk fogadása
router.post('/system', validateMonitorApiKey, async (req, res) => {
  try {
    const { server_id, system_info, services, timestamp } = req.body;
    
    // Szerver keresése az adatbázisban
    let server = await ServerMonitor.findOne({ server_id });
    
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Szerver nem található, először regisztrálja'
      });
    }
    
    // Rendszer információk frissítése
    if (system_info) {
      server.system_info = system_info;
    }
    
    if (services) {
      server.services = services;
    }
    
    // Historikus adatok tárolása
    if (system_info) {
      // Legfeljebb 1440 bejegyzést tárolunk (24 óra, percenként)
      if (server.history.length >= 1440) {
        server.history.shift(); // A legrégebbi bejegyzés törlése
      }
      
      server.history.push({
        timestamp: new Date(timestamp) || new Date(),
        cpu_usage: system_info.cpu?.usage_percent,
        memory_usage: system_info.memory?.usage_percent,
        disk_usage: system_info.disk?.usage_percent,
        load_average: system_info.cpu?.load_average
      });
    }
    
    // Riasztások generálása
    await generateAlerts(server);
    
    server.last_seen = new Date();
    await server.save();
    
    res.status(200).json({
      success: true,
      message: 'Rendszer információk sikeresen frissítve'
    });
  } catch (error) {
    console.error('Hiba a rendszer információk frissítésekor:', error);
    res.status(500).json({ 
      success: false,
      message: 'Szerver hiba az adatok mentése során', 
      error: error.message 
    });
  }
});

// Hálózati információk fogadása
router.post('/network', validateMonitorApiKey, async (req, res) => {
  try {
    const { server_id, speedtest, ping, timestamp } = req.body;
    
    // Szerver keresése az adatbázisban
    let server = await ServerMonitor.findOne({ server_id });
    
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Szerver nem található, először regisztrálja'
      });
    }
    
    // Hálózati adatok frissítése
    if (!server.network) server.network = {};
    
    if (speedtest) {
      server.network.speedtest = {
        download: speedtest.download,
        upload: speedtest.upload,
        ping: speedtest.ping,
        server: speedtest.server,
        timestamp: new Date(timestamp) || new Date()
      };
    }
    
    if (ping) {
      server.network.ping_results = ping;
    }
    
    // Történeti adatok frissítése
    if (server.history.length > 0) {
      const lastIndex = server.history.length - 1;
      if (speedtest && speedtest.ping) {
        server.history[lastIndex].network_latency = speedtest.ping;
      }
    }
    
    server.last_seen = new Date();
    await server.save();
    
    res.status(200).json({
      success: true,
      message: 'Hálózati információk sikeresen frissítve'
    });
  } catch (error) {
    console.error('Hiba a hálózati információk frissítésekor:', error);
    res.status(500).json({ 
      success: false,
      message: 'Szerver hiba a hálózati adatok mentése során', 
      error: error.message 
    });
  }
});

// Biztonsági információk fogadása
router.post('/security', validateMonitorApiKey, async (req, res) => {
  try {
    const { server_id, open_ports, active_ssh_connections, failed_login_attempts, updates_available, security_updates, timestamp } = req.body;
    
    // Szerver keresése az adatbázisban
    let server = await ServerMonitor.findOne({ server_id });
    
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Szerver nem található, először regisztrálja'
      });
    }
    
    // Biztonsági adatok frissítése
    if (!server.security) server.security = {};
    
    server.security = {
      open_ports: open_ports || server.security.open_ports,
      active_ssh_connections: active_ssh_connections !== undefined ? active_ssh_connections : server.security.active_ssh_connections,
      failed_login_attempts: failed_login_attempts || server.security.failed_login_attempts,
      updates_available: updates_available !== undefined ? updates_available : server.security.updates_available,
      security_updates: security_updates !== undefined ? security_updates : server.security.security_updates,
      last_security_check: new Date(timestamp) || new Date()
    };
    
    // Biztonsági riasztások ellenőrzése
    if (security_updates && parseInt(security_updates) > 0) {
      // Biztonsági frissítések riasztás
      const existingAlert = server.alerts.find(alert => 
        alert.type === 'security' && 
        alert.message.includes('biztonsági frissítés') &&
        !alert.acknowledged
      );
      
      if (!existingAlert) {
        server.alerts.push({
          type: 'security',
          severity: 'warning',
          message: `${security_updates} biztonsági frissítés elérhető`,
          timestamp: new Date()
        });
        
        // Értesítés küldése
        const notification = new Notification({
          userId: process.env.ADMIN_EMAIL || 'admin@example.com',
          type: 'server',
          title: 'Biztonsági figyelmeztetés',
          message: `${server.hostname}: ${security_updates} biztonsági frissítés elérhető`,
          severity: 'warning',
          link: '/infrastructure/monitoring'
        });
        
        await notification.save();
      }
    }
    
    if (failed_login_attempts && failed_login_attempts.length > 0) {
      // Sikertelen bejelentkezési kísérletek riasztás
      const existingAlert = server.alerts.find(alert => 
        alert.type === 'security' && 
        alert.message.includes('sikertelen bejelentkezés') &&
        !alert.acknowledged
      );
      
      if (!existingAlert) {
        server.alerts.push({
          type: 'security',
          severity: 'warning',
          message: 'Sikertelen bejelentkezési kísérletek észlelve',
          timestamp: new Date()
        });
      }
    }
    
    server.last_seen = new Date();
    await server.save();
    
    res.status(200).json({
      success: true,
      message: 'Biztonsági információk sikeresen frissítve'
    });
  } catch (error) {
    console.error('Hiba a biztonsági információk frissítésekor:', error);
    res.status(500).json({ 
      success: false,
      message: 'Szerver hiba a biztonsági adatok mentése során', 
      error: error.message 
    });
  }
});

// Riasztások generálása a szerver adatai alapján
async function generateAlerts(server) {
  try {
    // CPU terhelés ellenőrzése
    if (server.system_info?.cpu?.usage_percent >= server.settings?.alert_cpu_threshold || 90) {
      const existingAlert = server.alerts.find(alert => 
        alert.type === 'cpu' && 
        !alert.acknowledged
      );
      
      if (!existingAlert) {
        server.alerts.push({
          type: 'cpu',
          severity: 'warning',
          message: `Magas CPU használat: ${server.system_info.cpu.usage_percent}%`,
          timestamp: new Date()
        });
        
        // Értesítés küldése
        const notification = new Notification({
          userId: process.env.ADMIN_EMAIL || 'admin@example.com',
          type: 'server',
          title: 'CPU figyelmeztetés',
          message: `${server.hostname}: Magas CPU használat (${server.system_info.cpu.usage_percent}%)`,
          severity: 'warning',
          link: '/infrastructure/monitoring'
        });
        
        await notification.save();
      }
    }
    
    // Memória használat ellenőrzése
    if (server.system_info?.memory?.usage_percent >= server.settings?.alert_memory_threshold || 90) {
      const existingAlert = server.alerts.find(alert => 
        alert.type === 'memory' && 
        !alert.acknowledged
      );
      
      if (!existingAlert) {
        server.alerts.push({
          type: 'memory',
          severity: 'warning',
          message: `Magas memória használat: ${server.system_info.memory.usage_percent}%`,
          timestamp: new Date()
        });
        
        // Értesítés küldése
        const notification = new Notification({
          userId: process.env.ADMIN_EMAIL || 'admin@example.com',
          type: 'server',
          title: 'Memória figyelmeztetés',
          message: `${server.hostname}: Magas memória használat (${server.system_info.memory.usage_percent}%)`,
          severity: 'warning',
          link: '/infrastructure/monitoring'
        });
        
        await notification.save();
      }
    }
    
    // Lemezterület ellenőrzése
    if (server.system_info?.disk?.usage_percent >= server.settings?.alert_disk_threshold || 90) {
      const existingAlert = server.alerts.find(alert => 
        alert.type === 'disk' && 
        !alert.acknowledged
      );
      
      if (!existingAlert) {
        server.alerts.push({
          type: 'disk',
          severity: 'warning',
          message: `Alacsony szabad lemezterület: ${server.system_info.disk.usage_percent}% foglalt`,
          timestamp: new Date()
        });
        
        // Értesítés küldése
        const notification = new Notification({
          userId: process.env.ADMIN_EMAIL || 'admin@example.com',
          type: 'server',
          title: 'Lemezterület figyelmeztetés',
          message: `${server.hostname}: Alacsony szabad lemezterület (${server.system_info.disk.usage_percent}% foglalt)`,
          severity: 'warning',
          link: '/infrastructure/monitoring'
        });
        
        await notification.save();
      }
    }
  } catch (error) {
    console.error('Hiba a riasztások generálása során:', error);
  }
}

// Védett végpontok - csak bejelentkezett felhasználóknak

// Middleware a védett végpontokhoz
router.use(authMiddleware);

// Minden szerver lekérése
router.get('/servers', async (req, res) => {
  try {
    const servers = await ServerMonitor.find()
      .select('-history')  // Ne küldje el a teljes történeti adatokat
      .sort({ hostname: 1 });
    
    res.json(servers);
  } catch (error) {
    console.error('Hiba a szerverek lekérésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Egy szerver részletes adatainak lekérése
router.get('/servers/:id', async (req, res) => {
  try {
    const server = await ServerMonitor.findOne({ 
      server_id: req.params.id 
    });
    
    if (!server) {
      return res.status(404).json({ message: 'Szerver nem található' });
    }
    
    res.json(server);
  } catch (error) {
    console.error('Hiba a szerver részletes adatainak lekérésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Szerverek monitorozási összesítése
router.get('/summary', async (req, res) => {
  try {
    const totalServers = await ServerMonitor.countDocuments();
    const onlineServers = await ServerMonitor.countDocuments({ status: 'online' });
    const offlineServers = await ServerMonitor.countDocuments({ status: 'offline' });
    const warningServers = await ServerMonitor.countDocuments({
      alerts: { 
        $elemMatch: { 
          severity: 'warning',
          acknowledged: false
        } 
      }
    });
    const criticalServers = await ServerMonitor.countDocuments({
      alerts: { 
        $elemMatch: { 
          severity: 'critical',
          acknowledged: false
        } 
      }
    });
    
    // Az utolsó 30 nap átlagos erőforrás-használata
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const averageUsage = await ServerMonitor.aggregate([
      {
        $match: { 
          last_seen: { $gte: thirtyDaysAgo },
          status: 'online'
        }
      },
      {
        $group: {
          _id: null,
          avgCpuUsage: { $avg: '$system_info.cpu.usage_percent' },
          avgMemoryUsage: { $avg: '$system_info.memory.usage_percent' },
          avgDiskUsage: { $avg: '$system_info.disk.usage_percent' }
        }
      }
    ]);
    
    res.json({
      totalServers,
      onlineServers,
      offlineServers,
      warningServers,
      criticalServers,
      averageUsage: averageUsage[0] || {
        avgCpuUsage: 0,
        avgMemoryUsage: 0,
        avgDiskUsage: 0
      }
    });
  } catch (error) {
    console.error('Hiba az összesítés lekérésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Riasztás nyugtázása
router.put('/servers/:id/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const server = await ServerMonitor.findOne({ server_id: req.params.id });
    
    if (!server) {
      return res.status(404).json({ message: 'Szerver nem található' });
    }
    
    const alert = server.alerts.id(req.params.alertId);
    if (!alert) {
      return res.status(404).json({ message: 'Riasztás nem található' });
    }
    
    alert.acknowledged = true;
    await server.save();
    
    res.json({ message: 'Riasztás nyugtázva', server });
  } catch (error) {
    console.error('Hiba a riasztás nyugtázásakor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Szerver beállításainak frissítése
router.put('/servers/:id/settings', async (req, res) => {
  try {
    const { alert_cpu_threshold, alert_memory_threshold, alert_disk_threshold, monitored_services, notification_email, collection_interval } = req.body;
    
    const server = await ServerMonitor.findOne({ server_id: req.params.id });
    
    if (!server) {
      return res.status(404).json({ message: 'Szerver nem található' });
    }
    
    // Beállítások frissítése
    if (!server.settings) server.settings = {};
    
    if (alert_cpu_threshold !== undefined) server.settings.alert_cpu_threshold = alert_cpu_threshold;
    if (alert_memory_threshold !== undefined) server.settings.alert_memory_threshold = alert_memory_threshold;
    if (alert_disk_threshold !== undefined) server.settings.alert_disk_threshold = alert_disk_threshold;
    if (monitored_services) server.settings.monitored_services = monitored_services;
    if (notification_email) server.settings.notification_email = notification_email;
    if (collection_interval !== undefined) server.settings.collection_interval = collection_interval;
    
    await server.save();
    
    res.json({ 
      message: 'Szerver beállításai frissítve',
      settings: server.settings
    });
  } catch (error) {
    console.error('Hiba a szerver beállításainak frissítésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Minden riasztás nyugtázása egy szerveren
router.put('/servers/:id/alerts/acknowledge-all', async (req, res) => {
  try {
    const server = await ServerMonitor.findOne({ server_id: req.params.id });
    
    if (!server) {
      return res.status(404).json({ message: 'Szerver nem található' });
    }
    
    server.alerts.forEach(alert => {
      alert.acknowledged = true;
    });
    
    await server.save();
    
    res.json({ message: 'Minden riasztás nyugtázva', server });
  } catch (error) {
    console.error('Hiba az összes riasztás nyugtázásakor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Szerver kézi regisztrálása
router.post('/servers', async (req, res) => {
  try {
    const { hostname, ip_address, os } = req.body;
    
    // Szerver ID generálása
    const server_id = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);
    
    const server = new ServerMonitor({
      server_id,
      hostname,
      ip_address,
      os,
      status: 'offline', // Kezdetben offline, amíg nem jelentkezik be
      registration_time: new Date()
    });
    
    await server.save();
    
    // Telepítési útmutató generálása
    const installCommand = `curl -sSL https://admin.nb-studio.net:5001/api/monitoring/install.sh | sudo bash -s -- --server-id ${server_id}`;
    
    res.status(201).json({
      message: 'Szerver kézileg regisztrálva',
      server,
      installCommand
    });
  } catch (error) {
    console.error('Hiba a szerver kézi regisztrációjakor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Telepítő szkript letöltése
router.get('/install.sh', (req, res) => {
  const serverId = req.query.server_id || '';
  
  const installScript = `#!/bin/bash
# NB Studio Szerver Monitoring telepítő szkript
# Szerver ID: ${serverId}

echo "NB Studio Szerver Monitoring Telepítő"
echo "Szerver ID: ${serverId}"

if [ -z "${serverId}" ]; then
  echo "HIBA: Nincs megadva szerver ID!"
  echo "Használat: curl -sSL https://admin.nb-studio.net:5001/api/monitoring/install.sh | sudo bash -s -- --server-id YOUR_SERVER_ID"
  exit 1
fi

# Szükséges csomagok ellenőrzése
echo "Szükséges csomagok ellenőrzése..."
REQUIRED_PKGS="curl jq sysstat net-tools lsof"
for pkg in $REQUIRED_PKGS; do
  if ! command -v $pkg >/dev/null 2>&1; then
    echo "A(z) $pkg csomag telepítése szükséges."
    apt-get update && apt-get install -y $pkg || {
      echo "Nem sikerült telepíteni a(z) $pkg csomagot!"
      exit 1
    }
  fi
done

# Könyvtárak létrehozása
INSTALL_DIR="/opt/nbstudio-monitor"
CONFIG_DIR="/etc/nbstudio-monitor"
LOG_DIR="/var/log/nbstudio-monitor"

mkdir -p $INSTALL_DIR $CONFIG_DIR $LOG_DIR

# Konfiguráció létrehozása
cat > $CONFIG_DIR/config.json << EOF
{
  "server_id": "${serverId}",
  "api_url": "https://admin.nb-studio.net:5001/api/monitoring",
  "api_key": "qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0",
  "collection_interval": 60,
  "ping_hosts": ["8.8.8.8", "1.1.1.1"]
}
EOF

# Monitoring szkript letöltése
echo "Monitoring szkript letöltése..."
curl -sSL https://admin.nb-studio.net:5001/api/monitoring/server_monitor.sh > $INSTALL_DIR/server_monitor.sh
chmod +x $INSTALL_DIR/server_monitor.sh

# Systemd service létrehozása
cat > /etc/systemd/system/nbstudio-monitor.service << EOF
[Unit]
Description=NB Studio Server Monitoring Agent
After=network.target

[Service]
ExecStart=$INSTALL_DIR/server_monitor.sh
Restart=always
User=root
Environment=CONFIG_DIR=$CONFIG_DIR
Environment=LOG_DIR=$LOG_DIR

[Install]
WantedBy=multi-user.target
EOF

# Systemd service regisztrálása és indítása
systemctl daemon-reload
systemctl enable nbstudio-monitor
systemctl start nbstudio-monitor

echo "Monitoring szolgáltatás telepítve és elindítva!"
echo "A rendszer most regisztrálja a szervert és elkezdi a monitorozást."
echo "Napló fájl: $LOG_DIR/nbstudio-monitor.log"

# Szerver regisztrálása
HOSTNAME=$(hostname)
OS=$(lsb_release -ds 2>/dev/null || cat /etc/*release 2>/dev/null | head -n1 || uname -om)
IP_ADDRESS=$(ip route get 1 | awk '{print $NF;exit}')

echo "Szerver regisztrálása..."
curl -s -X POST "https://admin.nb-studio.net:5001/api/monitoring/register" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0" \
  -d "{
    \"server_id\": \"${serverId}\",
    \"hostname\": \"$HOSTNAME\",
    \"os\": \"$OS\",
    \"ip_address\": \"$IP_ADDRESS\"
  }"

echo "Telepítés befejezve! A monitoring adatok gyűjtése megkezdődött."
`;

  res.set('Content-Type', 'text/plain');
  res.send(installScript);
});

// Monitor szkript letöltése
router.get('/server_monitor.sh', (req, res) => {
  // Az eredeti monitorozó szkript fájl elérése és küldése
  const monitorScript = `#!/bin/bash
# NB Studio Szerver Monitoring Agent
# Version: 1.0

# Konfiguráció betöltése
CONFIG_DIR=${CONFIG_DIR:-"/etc/nbstudio-monitor"}
LOG_DIR=${LOG_DIR:-"/var/log/nbstudio-monitor"}
CONFIG_FILE="$CONFIG_DIR/config.json"
LOG_FILE="$LOG_DIR/nbstudio-monitor.log"

# Log függvény
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
  echo "$1"
}

if [ ! -f "$CONFIG_FILE" ]; then
  log "HIBA: Konfigurációs fájl nem található: $CONFIG_FILE"
  exit 1
fi

# Konfigurációs értékek betöltése
SERVER_ID=$(jq -r '.server_id' "$CONFIG_FILE")
API_URL=$(jq -r '.api_url' "$CONFIG_FILE")
API_KEY=$(jq -r '.api_key' "$CONFIG_FILE")
COLLECTION_INTERVAL=$(jq -r '.collection_interval' "$CONFIG_FILE")
PING_HOSTS=$(jq -r '.ping_hosts | join(" ")' "$CONFIG_FILE")

log "Monitoring agent indítása..."
log "Szerver ID: $SERVER_ID"
log "Adatgyűjtési gyakoriság: $COLLECTION_INTERVAL másodperc"

# CPU információk lekérése
get_cpu_info() {
  CPU_MODEL=$(grep "model name" /proc/cpuinfo | head -n1 | cut -d':' -f2 | sed 's/^[ \t]*//')
  CPU_CORES=$(grep -c "processor" /proc/cpuinfo)
  CPU_LOAD=($(cat /proc/loadavg | awk '{print $1, $2, $3}'))
  CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}')
  
  echo "{
    \"model\": \"$CPU_MODEL\",
    \"cores\": $CPU_CORES,
    \"load_average\": [${CPU_LOAD[0]}, ${CPU_LOAD[1]}, ${CPU_LOAD[2]}],
    \"usage_percent\": $CPU_USAGE
  }"
}

# Memória információk lekérése
get_memory_info() {
  MEM_TOTAL=$(free -m | awk 'NR==2{print $2}')
  MEM_USED=$(free -m | awk 'NR==2{print $3}')
  MEM_FREE=$(free -m | awk 'NR==2{print $4}')
  MEM_USAGE_PERCENT=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
  
  echo "{
    \"total\": $MEM_TOTAL,
    \"used\": $MEM_USED,
    \"free\": $MEM_FREE,
    \"usage_percent\": $MEM_USAGE_PERCENT
  }"
}

# Lemez információk lekérése
get_disk_info() {
  ROOT_DISK=$(df -Pk / | sed 1d)
  DISK_TOTAL=$(echo "$ROOT_DISK" | awk '{print $2/1024/1024}')
  DISK_USED=$(echo "$ROOT_DISK" | awk '{print $3/1024/1024}')
  DISK_FREE=$(echo "$ROOT_DISK" | awk '{print $4/1024/1024}')
  DISK_USAGE_PERCENT=$(echo "$ROOT_DISK" | awk '{print $5}' | tr -d '%')
  
  # Csatolási pontok
  MOUNTS=$(df -Pk | grep -v "tmpfs\\|udev\\|cdrom" | sed 1d | awk '{
    printf "{\\"mountpoint\\":\\"%s\\",\\"size\\":%f,\\"used\\":%f,\\"usage_percent\\":%d},", $6, $2/1024/1024, $3/1024/1024, $5+0
  }')
  MOUNTS="[${MOUNTS%,}]"
  
  echo "{
    \"total\": $DISK_TOTAL,
    \"used\": $DISK_USED,
    \"free\": $DISK_FREE,
    \"usage_percent\": $DISK_USAGE_PERCENT,
    \"mounts\": $MOUNTS
  }"
}

# Folyamat információk lekérése
get_process_info() {
  TOTAL_PROCS=$(ps -e | wc -l)
  RUNNING=$(ps -eo s | grep -c "R")
  SLEEPING=$(ps -eo s | grep -c "S")
  STOPPED=$(ps -eo s | grep -c "T")
  ZOMBIE=$(ps -eo s | grep -c "Z")
  
  echo "{
    \"total\": $TOTAL_PROCS,
    \"running\": $RUNNING,
    \"sleeping\": $SLEEPING,
    \"stopped\": $STOPPED,
    \"zombie\": $ZOMBIE
  }"
}

# Uptime lekérése
get_uptime() {
  cat /proc/uptime | awk '{print $1}'
}

# Rendszer részletes infók
get_os_details() {
  DISTRO=$(lsb_release -ds 2>/dev/null || cat /etc/*release 2>/dev/null | head -n1 || uname -om)
  VERSION=$(lsb_release -rs 2>/dev/null || echo "unknown")
  KERNEL=$(uname -r)
  
  echo "{
    \"distribution\": \"$DISTRO\",
    \"version\": \"$VERSION\",
    \"kernel\": \"$KERNEL\"
  }"
}

# Szolgáltatás információk
get_services_info() {
  SERVICES=()
  
  # Néhány általános szolgáltatás ellenőrzése
  CHECK_SERVICES="nginx apache2 mysql postgresql docker sshd"
  
  for service in $CHECK_SERVICES; do
    if systemctl is-active --quiet $service 2>/dev/null; then
      PID=$(pidof $service)
      if [ -z "$PID" ]; then
        PID=$(ps aux | grep $service | grep -v grep | awk '{print $2}' | head -1)
      fi
      
      if [ -n "$PID" ]; then
        MEM_USAGE=$(ps -o rss= -p $PID | awk '{print $1/1024}')
        CPU_USAGE=$(ps -o %cpu= -p $PID | awk '{print $1}')
        
        SERVICES+=("{
          \"name\": \"$service\",
          \"status\": \"running\",
          \"process_id\": $PID,
          \"memory_usage\": $MEM_USAGE,
          \"cpu_usage\": $CPU_USAGE
        },")
      else
        SERVICES+=("{
          \"name\": \"$service\",
          \"status\": \"running\",
          \"process_id\": 0,
          \"memory_usage\": 0,
          \"cpu_usage\": 0
        },")
      fi
    fi
  done
  
  # Portok ellenőrzése
  PORTS=(80 443 22 3306 5432 27017 6379)
  
  for port in "${PORTS[@]}"; do
    if netstat -tuln | grep -q ":$port\\s"; then
      SERVICE=$(netstat -tulnp | grep ":$port\\s" | awk '{print $7}' | cut -d'/' -f2 | head -1)
      if [ -z "$SERVICE" ]; then SERVICE="unknown"; fi
      
      PID=$(netstat -tulnp | grep ":$port\\s" | awk '{print $7}' | cut -d'/' -f1 | head -1)
      if [ -z "$PID" ] || [ "$PID" = "-" ]; then PID=0; fi
      
      if [ $PID -ne 0 ]; then
        MEM_USAGE=$(ps -o rss= -p $PID 2>/dev/null | awk '{print $1/1024}')
        CPU_USAGE=$(ps -o %cpu= -p $PID 2>/dev/null | awk '{print $1}')
        
        SERVICES+=("{
          \"name\": \"$SERVICE\",
          \"status\": \"running\",
          \"port\": $port,
          \"process_id\": $PID,
          \"memory_usage\": $MEM_USAGE,
          \"cpu_usage\": $CPU_USAGE
        },")
      else
        SERVICES+=("{
          \"name\": \"$SERVICE\",
          \"status\": \"unknown\",
          \"port\": $port,
          \"process_id\": 0,
          \"memory_usage\": 0,
          \"cpu_usage\": 0
        },")
      fi
    fi
  done
  
  # Ha van adat, távolítsuk el az utolsó vesszőt
  if [ ${#SERVICES[@]} -gt 0 ]; then
    SERVICES_JSON=$(echo "${SERVICES[@]}" | sed 's/,$//g')
  else
    SERVICES_JSON=""
  fi
  
  echo "[${SERVICES_JSON}]"
}

# Hálózati ping
ping_hosts() {
  RESULTS=()
  
  for host in $PING_HOSTS; do
    ping_result=$(ping -c 3 $host)
    if [ $? -eq 0 ]; then
      min=$(echo "$ping_result" | grep -oP 'min/avg/max.*?/\K[0-9.]+')
      avg=$(echo "$ping_result" | grep -oP 'min/avg/max.*?/[0-9.]+/\K[0-9.]+')
      max=$(echo "$ping_result" | grep -oP 'min/avg/max.*?/[0-9.]+/[0-9.]+/\K[0-9.]+')
      loss=$(echo "$ping_result" | grep -oP '[0-9]+% packet loss' | cut -d'%' -f1)
      
      RESULTS+=("{
        \"host\": \"$host\",
        \"min\": $min,
        \"avg\": $avg,
        \"max\": $max,
        \"packet_loss\": $loss
      },")
    else
      RESULTS+=("{
        \"host\": \"$host\",
        \"min\": 0,
        \"avg\": 0,
        \"max\": 0,
        \"packet_loss\": 100
      },")
    fi
  done
  
  # Távolítsuk el az utolsó vesszőt
  PING_JSON=$(echo "${RESULTS[@]}" | sed 's/,$//g')
  
  echo "[${PING_JSON}]"
}

# Biztonsági információk
get_security_info() {
  OPEN_PORTS=$(netstat -tuln | grep -v "127.0.0.1" | grep "LISTEN" | awk '{print $4}' | rev | cut -d':' -f1 | rev | sort -n | uniq | jq -R -s -c 'split("\n")[:-1]')
  SSH_CONNECTIONS=$(who | grep -c "pts")
  
  FAILED_LOGINS=()
  if [ -f /var/log/auth.log ]; then
    FAILED_ATTEMPTS=$(grep "Failed password" /var/log/auth.log | tail -5)
    while read -r line; do
      if [ -n "$line" ]; then
        USER=$(echo "$line" | grep -oP 'for \K[^ ]+')
        IP=$(echo "$line" | grep -oP 'from \K[^ ]+')
        TIME=$(echo "$line" | grep -oP '^[^ ]+ +[^ ]+ +[^ ]+')
        
        FAILED_LOGINS+=("{
          \"user\": \"$USER\",
          \"ip\": \"$IP\",
          \"timestamp\": \"$TIME\"
        },")
      fi
    done <<< "$FAILED_ATTEMPTS"
  fi
  
  # Távolítsuk el az utolsó vesszőt
  if [ ${#FAILED_LOGINS[@]} -gt 0 ]; then
    FAILED_LOGINS_JSON=$(echo "${FAILED_LOGINS[@]}" | sed 's/,$//g')
    FAILED_LOGINS_JSON="[${FAILED_LOGINS_JSON}]"
  else
    FAILED_LOGINS_JSON="[]"
  fi
  
  # Frissítések ellenőrzése
  UPDATES_AVAILABLE=0
  SECURITY_UPDATES=0
  
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq >/dev/null 2>&1
    UPDATES_AVAILABLE=$(apt-get -s upgrade | grep -c "^Inst")
    SECURITY_UPDATES=$(apt-get -s upgrade | grep -c "^Inst.*security")
  elif command -v yum >/dev/null 2>&1; then
    yum check-update -q >/dev/null 2>&1
    UPDATES_AVAILABLE=$(yum check-update -q | grep -v "^$" | grep -v "Loaded plugins" | wc -l)
    SECURITY_UPDATES=$(yum check-update --security -q | grep -v "^$" | grep -v "Loaded plugins" | wc -l)
  fi
  
  echo "{
    \"open_ports\": $OPEN_PORTS,
    \"active_ssh_connections\": $SSH_CONNECTIONS,
    \"failed_login_attempts\": $FAILED_LOGINS_JSON,
    \"updates_available\": $UPDATES_AVAILABLE,
    \"security_updates\": $SECURITY_UPDATES
  }"
}

# Rendszer adatok gyűjtése és küldése
collect_system_data() {
  CPU_INFO=$(get_cpu_info)
  MEMORY_INFO=$(get_memory_info)
  DISK_INFO=$(get_disk_info)
  PROCESS_INFO=$(get_process_info)
  UPTIME=$(get_uptime)
  OS_DETAILS=$(get_os_details)
  SERVICES=$(get_services_info)
  
  SYSTEM_JSON="{
    \"server_id\": \"$SERVER_ID\",
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
    \"system_info\": {
      \"os_details\": $OS_DETAILS,
      \"cpu\": $CPU_INFO,
      \"memory\": $MEMORY_INFO,
      \"disk\": $DISK_INFO,
      \"processes\": $PROCESS_INFO,
      \"uptime\": $UPTIME
    },
    \"services\": $SERVICES
  }"
  
  # Adatok küldése az API-nak
  HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/system" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "$SYSTEM_JSON")
  
  if [ "$HTTP_RESPONSE" = "200" ]; then
    log "Rendszer információk sikeresen elküldve"
  else
    log "Hiba a rendszer információk küldésekor. HTTP kód: $HTTP_RESPONSE"
  fi
}

# Hálózati adatok gyűjtése és küldése
collect_network_data() {
  PING_RESULTS=$(ping_hosts)
  
  NETWORK_JSON="{
    \"server_id\": \"$SERVER_ID\",
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
    \"ping\": $PING_RESULTS
  }"
  
  # Adatok küldése az API-nak
  HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/network" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "$NETWORK_JSON")
  
  if [ "$HTTP_RESPONSE" = "200" ]; then
    log "Hálózati információk sikeresen elküldve"
  else
    log "Hiba a hálózati információk küldésekor. HTTP kód: $HTTP_RESPONSE"
  fi
}

# Biztonsági adatok gyűjtése és küldése
collect_security_data() {
  SECURITY_INFO=$(get_security_info)
  
  SECURITY_JSON="{
    \"server_id\": \"$SERVER_ID\",
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
    \"open_ports\": $(echo "$SECURITY_INFO" | jq -r '.open_ports'),
    \"active_ssh_connections\": $(echo "$SECURITY_INFO" | jq -r '.active_ssh_connections'),
    \"failed_login_attempts\": $(echo "$SECURITY_INFO" | jq -r '.failed_login_attempts'),
    \"updates_available\": $(echo "$SECURITY_INFO" | jq -r '.updates_available'),
    \"security_updates\": $(echo "$SECURITY_INFO" | jq -r '.security_updates')
  }"
  
  # Adatok küldése az API-nak
  HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/security" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "$SECURITY_JSON")
  
  if [ "$HTTP_RESPONSE" = "200" ]; then
    log "Biztonsági információk sikeresen elküldve"
  else
    log "Hiba a biztonsági információk küldésekor. HTTP kód: $HTTP_RESPONSE"
  fi
}

# Fő adatgyűjtési függvény
collect_data() {
  log "Adatgyűjtés indítása..."
  
  # Rendszer adatok
  collect_system_data
  
  # Hálózati adatok
  collect_network_data
  
  # Biztonsági adatok
  collect_security_data
  
  log "Adatgyűjtés befejezve"
}

# Végtelen ciklus a monitorozáshoz
while true; do
  collect_data
  sleep $COLLECTION_INTERVAL
done
`;
  
  res.set('Content-Type', 'text/plain');
  res.send(monitorScript);
});

export default router;