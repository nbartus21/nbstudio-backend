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
router.post('/monitoring/register', validateMonitorApiKey, async (req, res) => {
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

// Hálózati információk fogadása
router.post('/monitoring/network', validateMonitorApiKey, async (req, res) => {
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
router.post('/monitoring/security', validateMonitorApiKey, async (req, res) => {
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
router.get('/monitoring/servers', async (req, res) => {
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
router.get('/monitoring/servers/:id', async (req, res) => {
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
router.get('/monitoring/summary', async (req, res) => {
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
router.put('/monitoring/servers/:id/alerts/:alertId/acknowledge', async (req, res) => {
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
router.put('/monitoring/servers/:id/settings', async (req, res) => {
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
router.put('/monitoring/servers/:id/alerts/acknowledge-all', async (req, res) => {
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
router.post('/monitoring/servers', async (req, res) => {
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
router.get('/monitoring/install.sh', (req, res) => {
  const serverId = req.query.server_id || '';
  
  const installScript = `#!/bin/bash
# NB Studio Szerver Monitoring telepítő szkript
# Szerver ID: ${serverId}

echo "NB Studio Szerver Monitoring Telepítő"
echo "Szerver ID: ${serverId}"

# Letöltés
echo "Monitoring szkript letöltése..."
curl -sSL https://admin.nb-studio.net:5001/api/monitoring/server_monitor.sh -o /tmp/server_monitor.sh
chmod +x /tmp/server_monitor.sh

# Konfiguráció
echo "SERVER_ID=\\"${serverId}\\"" > /etc/nbstudio-monitor.conf

# Telepítés
echo "Telepítés indítása..."
/tmp/server_monitor.sh --install

echo "Telepítés befejezve!"
`;

  res.set('Content-Type', 'text/plain');
  res.send(installScript);
});

// Monitor szkript letöltése
router.get('/monitoring/server_monitor.sh', (req, res) => {
  // Az eredeti monitorozó szkript fájl elérése és küldése
  // Ezt a fájlt a szervernek el kell érnie
  
  res.set('Content-Type', 'text/plain');
  // Itt küldjük el a monitorozó szkript tartalmát
  res.send(`#!/bin/bash
# NB Studio Szerver Monitoring Tool
# Verzió: 1.0.0
# Leírás: Automatikus szerver monitorozó szkript

# Konfiguráció
API_URL="https://admin.nb-studio.net:5001/api/monitoring"
API_KEY="qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0"
SERVER_ID=""
COLLECTION_INTERVAL=60  # másodperc
LOG_FILE="/var/log/nbstudio-monitor.log"
CONFIG_FILE="/etc/nbstudio-monitor.conf"
PING_HOSTS=("8.8.8.8" "1.1.1.1")

# Teljes monitorozó szkript...
# (Itt az eredeti server_monitor.sh teljes tartalma következne)
`);
});

export default router;