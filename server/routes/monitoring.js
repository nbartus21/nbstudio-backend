import express from 'express';
import ServerMonitor from '../models/ServerMonitor.js';
import Notification from '../models/Notification.js';
import dotenv from 'dotenv';
import authMiddleware from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const router = express.Router();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Rendszer információk fogadása
router.post('/monitoring/system', validateMonitorApiKey, async (req, res) => {
  try {
    const { server_id, system_info, services, processes, timestamp } = req.body;
    
    // Szerver keresése az adatbázisban
    let server = await ServerMonitor.findOne({ server_id });
    
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Szerver nem található, először regisztrálja'
      });
    }
    
    // Rendszer adatok frissítése
    if (system_info) {
      server.system_info = {
        ...server.system_info,
        ...system_info
      };
    }
    
    // Szolgáltatások frissítése
    if (services) {
      server.services = services;
    }
    
    // Process lista frissítése
    if (processes) {
      server.processes = processes;
    }
    
    // Történeti adatok frissítése
    server.history.push({
      timestamp: new Date(timestamp) || new Date(),
      cpu_usage: system_info?.cpu?.usage_percent || 0,
      memory_usage: system_info?.memory?.usage_percent || 0,
      disk_usage: system_info?.disk?.usage_percent || 0,
      load_avg_1m: system_info?.cpu?.load_average?.[0] || 0,
      load_avg_5m: system_info?.cpu?.load_average?.[1] || 0,
      load_avg_15m: system_info?.cpu?.load_average?.[2] || 0,
      network_rx: system_info?.network?.rx_bytes_per_sec || 0,
      network_tx: system_info?.network?.tx_bytes_per_sec || 0,
      disk_read_mbps: system_info?.disk?.read_mbps || 0,
      disk_write_mbps: system_info?.disk?.write_mbps || 0,
      swap_usage: system_info?.memory?.swap_percent || 0
    });
    
    // Csak az utolsó 100 történeti adatot tartjuk meg
    if (server.history.length > 100) {
      server.history = server.history.slice(-100);
    }
    
    // Health score számítása
    const cpuScore = 100 - (system_info?.cpu?.usage_percent || 0);
    const memoryScore = 100 - (system_info?.memory?.usage_percent || 0);
    const diskScore = 100 - (system_info?.disk?.usage_percent || 0);
    
    // Súlyozott átlag a health score-hoz
    server.healthScore = Math.round((cpuScore * 0.4) + (memoryScore * 0.4) + (diskScore * 0.2));
    
    // Riasztások generálása a kapott adatok alapján
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
      message: 'Szerver hiba a rendszer adatok mentése során', 
      error: error.message 
    });
  }
});

// Hálózati információk fogadása
router.post('/monitoring/network', validateMonitorApiKey, async (req, res) => {
  try {
    const { server_id, interfaces, active_connections, speedtest, ping_results, timestamp } = req.body;
    
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
    
    if (interfaces) {
      server.network.interfaces = interfaces;
    }
    
    if (active_connections !== undefined) {
      server.network.active_connections = active_connections;
    }
    
    if (speedtest) {
      server.network.speedtest = {
        download: speedtest.download,
        upload: speedtest.upload,
        ping: speedtest.ping,
        server: speedtest.server,
        timestamp: new Date(timestamp) || new Date()
      };
    }
    
    if (ping_results) {
      server.network.ping_results = ping_results;
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
    const { 
      server_id, 
      open_ports, 
      ports_info,
      active_ssh_connections, 
      ssh_sessions,
      failed_login_attempts, 
      updates_available, 
      security_updates,
      pending_packages,
      audit_results,
      timestamp 
    } = req.body;
    
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
    
    if (open_ports) server.security.open_ports = open_ports;
    if (ports_info) server.security.ports_info = ports_info;
    if (active_ssh_connections !== undefined) server.security.active_ssh_connections = active_ssh_connections;
    if (ssh_sessions) server.security.ssh_sessions = ssh_sessions;
    if (failed_login_attempts) server.security.failed_login_attempts = failed_login_attempts;
    if (updates_available !== undefined) server.security.updates_available = updates_available;
    if (security_updates !== undefined) server.security.security_updates = security_updates;
    if (pending_packages) server.security.pending_packages = pending_packages;
    if (audit_results) server.security.audit_results = audit_results;
    
    server.security.last_security_check = new Date(timestamp) || new Date();
    
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
          severity: parseInt(security_updates) > 5 ? 'critical' : 'warning',
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
    const settings = server.settings || {};
    const cpuThreshold = settings.alert_cpu_threshold || 90;
    const memoryThreshold = settings.alert_memory_threshold || 90;
    const diskThreshold = settings.alert_disk_threshold || 90;
    
    // CPU terhelés ellenőrzése
    if (server.system_info?.cpu?.usage_percent >= cpuThreshold) {
      const existingAlert = server.alerts.find(alert => 
        alert.type === 'cpu' && 
        !alert.acknowledged
      );
      
      if (!existingAlert) {
        server.alerts.push({
          type: 'cpu',
          severity: server.system_info.cpu.usage_percent >= 95 ? 'critical' : 'warning',
          message: `Magas CPU használat: ${server.system_info.cpu.usage_percent.toFixed(1)}%`,
          timestamp: new Date()
        });
        
        // Értesítés küldése
        const notification = new Notification({
          userId: process.env.ADMIN_EMAIL || 'admin@example.com',
          type: 'server',
          title: 'CPU figyelmeztetés',
          message: `${server.hostname}: Magas CPU használat (${server.system_info.cpu.usage_percent.toFixed(1)}%)`,
          severity: 'warning',
          link: '/infrastructure/monitoring'
        });
        
        await notification.save();
      }
    }
    
    // Memória használat ellenőrzése
    if (server.system_info?.memory?.usage_percent >= memoryThreshold) {
      const existingAlert = server.alerts.find(alert => 
        alert.type === 'memory' && 
        !alert.acknowledged
      );
      
      if (!existingAlert) {
        server.alerts.push({
          type: 'memory',
          severity: server.system_info.memory.usage_percent >= 95 ? 'critical' : 'warning',
          message: `Magas memória használat: ${server.system_info.memory.usage_percent.toFixed(1)}%`,
          timestamp: new Date()
        });
        
        // Értesítés küldése
        const notification = new Notification({
          userId: process.env.ADMIN_EMAIL || 'admin@example.com',
          type: 'server',
          title: 'Memória figyelmeztetés',
          message: `${server.hostname}: Magas memória használat (${server.system_info.memory.usage_percent.toFixed(1)}%)`,
          severity: 'warning',
          link: '/infrastructure/monitoring'
        });
        
        await notification.save();
      }
    }
    
    // Lemezterület ellenőrzése
    if (server.system_info?.disk?.usage_percent >= diskThreshold) {
      const existingAlert = server.alerts.find(alert => 
        alert.type === 'disk' && 
        !alert.acknowledged
      );
      
      if (!existingAlert) {
        server.alerts.push({
          type: 'disk',
          severity: server.system_info.disk.usage_percent >= 95 ? 'critical' : 'warning',
          message: `Alacsony szabad lemezterület: ${server.system_info.disk.usage_percent.toFixed(1)}% foglalt`,
          timestamp: new Date()
        });
        
        // Értesítés küldése
        const notification = new Notification({
          userId: process.env.ADMIN_EMAIL || 'admin@example.com',
          type: 'server',
          title: 'Lemezterület figyelmeztetés',
          message: `${server.hostname}: Alacsony szabad lemezterület (${server.system_info.disk.usage_percent.toFixed(1)}% foglalt)`,
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

// Offline szerverek ellenőrzése időszakosan
async function checkOfflineServers() {
  try {
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    
    const servers = await ServerMonitor.find({
      status: { $ne: 'offline' },
      last_seen: { $lt: fiveMinutesAgo }
    });
    
    for (const server of servers) {
      // Állapot beállítása offline-ra
      server.status = 'offline';
      
      // Nincs-e már offline riasztás
      const existingOfflineAlert = server.alerts.find(alert => 
        alert.type === 'other' && 
        alert.message.includes('offline') &&
        !alert.acknowledged
      );
      
      if (!existingOfflineAlert) {
        server.alerts.push({
          type: 'other',
          severity: 'critical',
          message: 'A szerver offline állapotban van',
          timestamp: new Date()
        });
        
        // Értesítés küldése
        const notification = new Notification({
          userId: process.env.ADMIN_EMAIL || 'admin@example.com',
          type: 'server',
          title: 'Szerver offline',
          message: `${server.hostname} szerver nem elérhető`,
          severity: 'error',
          link: '/infrastructure/monitoring'
        });
        
        await notification.save();
      }
      
      await server.save();
    }
  } catch (error) {
    console.error('Hiba az offline szerverek ellenőrzése során:', error);
  }
}

// Offline szerverek ellenőrzése 5 percenként
setInterval(checkOfflineServers, 5 * 60 * 1000);

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
      registration_time: new Date(),
      last_seen: new Date()
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

// Szerver törlése
router.delete('/monitoring/servers/:id', async (req, res) => {
  try {
    const result = await ServerMonitor.deleteOne({ server_id: req.params.id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Szerver nem található' });
    }
    
    // Értesítés létrehozása a törlésről
    const notification = new Notification({
      userId: process.env.ADMIN_EMAIL || 'admin@example.com',
      type: 'server',
      title: 'Szerver törölve',
      message: `Egy szerver törölve lett a monitoring rendszerből (ID: ${req.params.id})`,
      severity: 'info',
      link: '/infrastructure/monitoring'
    });
    
    await notification.save();
    
    res.json({ message: 'Szerver sikeresen törölve' });
  } catch (error) {
    console.error('Hiba a szerver törlésekor:', error);
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
echo "API_KEY=\\"${process.env.MONITOR_API_KEY || ''}\\"" >> /etc/nbstudio-monitor.conf
echo "API_URL=\\"https://admin.nb-studio.net:5001/api\\"" >> /etc/nbstudio-monitor.conf
echo "COLLECTION_INTERVAL=\\"60\\"" >> /etc/nbstudio-monitor.conf

# Telepítés
echo "Telepítés indítása..."
/tmp/server_monitor.sh --install

echo "Telepítés befejezve!"
`;

  res.set('Content-Type', 'text/plain');
  res.send(installScript);
});

// Eltávolító szkript letöltése
router.get('/monitoring/uninstall.sh', (req, res) => {
  const serverId = req.query.server_id || '';
  
  const uninstallScript = `#!/bin/bash
# NB Studio Szerver Monitoring eltávolító szkript
# Szerver ID: ${serverId}

echo "NB Studio Szerver Monitoring Eltávolító"
echo "Szerver ID: ${serverId}"

# Szolgáltatás leállítása
if systemctl is-active --quiet nbstudio-monitor; then
  echo "Monitoring szolgáltatás leállítása..."
  systemctl stop nbstudio-monitor
  systemctl disable nbstudio-monitor
fi

# Szkript és konfiguráció eltávolítása
echo "Fájlok eltávolítása..."
rm -f /usr/local/bin/nbstudio-monitor.sh
rm -f /etc/nbstudio-monitor.conf
rm -f /etc/systemd/system/nbstudio-monitor.service
rm -f /var/log/nbstudio-monitor.log

# Systemd frissítése
systemctl daemon-reload

echo "A monitoring ügynök sikeresen eltávolítva a szerverről."
echo "Megjegyzés: A szerver adatai megmaradtak a monitoring rendszerben."
`;

  res.set('Content-Type', 'text/plain');
  res.send(uninstallScript);
});

// Monitor szkript letöltése
router.get('/monitoring/server_monitor.sh', (req, res) => {
  // Az eredeti monitorozó szkript fájl elérése és küldése
  const monitorScript = `#!/bin/bash
# NB Studio Szerver Monitoring Tool
# Verzió: 1.0.0
# Leírás: Automatikus szerver monitorozó szkript

# Konfiguráció betöltése
CONFIG_FILE="/etc/nbstudio-monitor.conf"
if [ -f "$CONFIG_FILE" ]; then
  source "$CONFIG_FILE"
else
  echo "Hiba: Konfigurációs fájl nem található: $CONFIG_FILE"
  exit 1
fi

# Alapértelmezett beállítások
API_URL="\${API_URL:-https://admin.nb-studio.net:5001/api}"
LOG_FILE="/var/log/nbstudio-monitor.log"
COLLECTION_INTERVAL="\${COLLECTION_INTERVAL:-60}"
PING_HOSTS=("8.8.8.8" "1.1.1.1" "amazon.com" "google.com")

# Funkciók
log_message() {
  echo "[\$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
  if [ "$2" = "stdout" ]; then
    echo "[\$(date '+%Y-%m-%d %H:%M:%S')] $1"
  fi
}

# Rendszer információk gyűjtése
collect_system_info() {
  log_message "Rendszer információk gyűjtése..."
  
  # OS információk
  OS_DETAILS=\$(cat /etc/os-release 2>/dev/null || echo "Unknown")
  KERNEL_VERSION=\$(uname -r)
  
  # CPU információk
  CPU_MODEL=\$(grep "model name" /proc/cpuinfo | head -n1 | cut -d: -f2 | sed 's/^[ \t]*//')
  CPU_CORES=\$(grep -c "processor" /proc/cpuinfo)
  CPU_USAGE=\$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}')
  LOAD_AVG=\$(cat /proc/loadavg | awk '{print $1,$2,$3}')
  
  # Memória információk
  MEM_TOTAL=\$(free -m | grep "Mem:" | awk '{print $2}')
  MEM_USED=\$(free -m | grep "Mem:" | awk '{print $3}')
  MEM_FREE=\$(free -m | grep "Mem:" | awk '{print $4}')
  MEM_USAGE_PERCENT=\$(echo "scale=2; $MEM_USED * 100 / $MEM_TOTAL" | bc)
  
  # Swap információk
  SWAP_TOTAL=\$(free -m | grep "Swap:" | awk '{print $2}')
  SWAP_USED=\$(free -m | grep "Swap:" | awk '{print $3}')
  SWAP_PERCENT=0
  if [ "$SWAP_TOTAL" -gt 0 ]; then
    SWAP_PERCENT=\$(echo "scale=2; $SWAP_USED * 100 / $SWAP_TOTAL" | bc)
  fi
  
  # Lemez információk
  DISK_TOTAL=\$(df -h / | awk 'NR==2 {print $2}')
  DISK_USED=\$(df -h / | awk 'NR==2 {print $3}')
  DISK_FREE=\$(df -h / | awk 'NR==2 {print $4}')
  DISK_USAGE_PERCENT=\$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
  
  # I/O teljesítmény
  if command -v iostat &> /dev/null; then
    DISK_IO=\$(iostat -kx 1 2 | tail -n 3)
    DISK_READ_MBPS=\$(echo "$DISK_IO" | awk '{print $6/1024}')
    DISK_WRITE_MBPS=\$(echo "$DISK_IO" | awk '{print $7/1024}')
  else
    DISK_READ_MBPS=0
    DISK_WRITE_MBPS=0
  fi
  
  # Uptime
  UPTIME_SECONDS=\$(cat /proc/uptime | awk '{print $1}')
  
  # Process információk
  TOTAL_PROCESSES=\$(ps aux | wc -l)
  RUNNING_PROCESSES=\$(ps aux | grep -c "R")
  SLEEPING_PROCESSES=\$(ps aux | grep -c "S")
  STOPPED_PROCESSES=\$(ps aux | grep -c "T")
  ZOMBIE_PROCESSES=\$(ps aux | grep -c "Z")
  
  # Top processek
  TOP_PROCESSES=\$(ps aux --sort=-%cpu | head -n 6 | tail -n 5 | awk '{printf "{\\"pid\\":%s,\\"user\\":\\"%s\\",\\"cpu\\":%s,\\"memory\\":%s,\\"name\\":\\"%s\\"},", $2, $1, $3, $4, $11}')
  TOP_PROCESSES="[${TOP_PROCESSES%}]"
  
  # JSON formázás
  SYSTEM_INFO="{
    \\"os_details\\": {
      \\"distribution\\": \\"\$(grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '\"')\\",
      \\"version\\": \\"\$(grep VERSION_ID /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '\"')\\",
      \\"kernel\\": \\"$KERNEL_VERSION\\"
    },
    \\"cpu\\": {
      \\"model\\": \\"$CPU_MODEL\\",
      \\"cores\\": $CPU_CORES,
      \\"usage_percent\\": $CPU_USAGE,
      \\"load_average\\": [$LOAD_AVG]
    },
    \\"memory\\": {
      \\"total_mb\\": $MEM_TOTAL,
      \\"used_mb\\": $MEM_USED,
      \\"free_mb\\": $MEM_FREE,
      \\"usage_percent\\": $MEM_USAGE_PERCENT,
      \\"swap_percent\\": $SWAP_PERCENT
    },
    \\"disk\\": {
      \\"total\\": \\"$DISK_TOTAL\\",
      \\"used\\": \\"$DISK_USED\\",
      \\"free\\": \\"$DISK_FREE\\",
      \\"usage_percent\\": $DISK_USAGE_PERCENT,
      \\"read_mbps\\": $DISK_READ_MBPS,
      \\"write_mbps\\": $DISK_WRITE_MBPS
    },
    \\"processes\\": {
      \\"total\\": $TOTAL_PROCESSES,
      \\"running\\": $RUNNING_PROCESSES,
      \\"sleeping\\": $SLEEPING_PROCESSES,
      \\"stopped\\": $STOPPED_PROCESSES,
      \\"zombie\\": $ZOMBIE_PROCESSES
    },
    \\"uptime\\": $UPTIME_SECONDS
  }"
  
  # Szolgáltatások
  SERVICES="[]"
  if command -v systemctl &> /dev/null; then
    SERVICES_LIST=\$(systemctl list-units --type=service --state=running | grep '\.service' | awk '{print $1}' | head -n 10)
    SERVICES_JSON=""
    for service in $SERVICES_LIST; do
      if [ -n "$SERVICES_JSON" ]; then
        SERVICES_JSON="$SERVICES_JSON,"
      fi
      SERVICES_JSON="$SERVICES_JSON\\"$service\\""
    done
    SERVICES="[$SERVICES_JSON]"
  fi
  
  # Adatok küldése a szerverre
  curl -s -X POST "$API_URL/monitoring/system" \
    -H "Content-Type: application/json" \
    -H "X-API-KEY: $API_KEY" \
    -d "{
      \\"server_id\\": \\"$SERVER_ID\\",
      \\"system_info\\": $SYSTEM_INFO,
      \\"processes\\": $TOP_PROCESSES,
      \\"services\\": $SERVICES,
      \\"timestamp\\": \\"\$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\\"
    }" >> "$LOG_FILE" 2>&1
}

# Hálózati információk gyűjtése
collect_network_info() {
  log_message "Hálózati információk gyűjtése..."
  
  # Hálózati interfészek
  INTERFACES="[]"
  if command -v ip &> /dev/null; then
    INTERFACES_DATA=\$(ip -j addr show)
    INTERFACES=\$(echo "$INTERFACES_DATA" | jq '[.[] | {
      name: .ifname,
      ip: (.addr_info[] | select(.family == "inet") | .local // ""),
      ipv6: (.addr_info[] | select(.family == "inet6") | .local // ""),
      mac: .address,
      is_virtual: (.ifname | contains("vir") or contains("tun") or contains("tap") or contains("docker") or contains("br-"))
    }]')
  fi
  
  # Aktív kapcsolatok
  ACTIVE_CONNECTIONS=\$(netstat -an | grep ESTABLISHED | wc -l)
  
  # Ping tesztek
  PING_RESULTS="{}"
  if command -v ping &> /dev/null; then
    PING_JSON=""
    for host in "\${PING_HOSTS[@]}"; do
      ping_result=\$(ping -c 3 "$host" 2>/dev/null | tail -1 | awk '{print $4}' | cut -d '/' -f 2)
      if [ -n "$ping_result" ]; then
        if [ -n "$PING_JSON" ]; then
          PING_JSON="$PING_JSON,"
        fi
        PING_JSON="$PING_JSON\\"$host\\": $ping_result"
      fi
    done
    PING_RESULTS="{$PING_JSON}"
  fi
  
  # Speedtest (ha telepítve van)
  SPEEDTEST="{}"
  if command -v speedtest-cli &> /dev/null; then
    # Csak naponta egyszer futtatjuk a speedtestet
    LAST_SPEEDTEST_FILE="/tmp/last_speedtest"
    RUN_SPEEDTEST=0
    
    if [ ! -f "$LAST_SPEEDTEST_FILE" ]; then
      RUN_SPEEDTEST=1
    else
      LAST_RUN=\$(cat "$LAST_SPEEDTEST_FILE")
      CURRENT_TIME=\$(date +%s)
      DIFF=\$(( CURRENT_TIME - LAST_RUN ))
      
      # 24 óra = 86400 másodperc
      if [ "$DIFF" -gt 86400 ]; then
        RUN_SPEEDTEST=1
      fi
    fi
    
    if [ "$RUN_SPEEDTEST" -eq 1 ]; then
      log_message "Speedtest futtatása..."
      SPEEDTEST_RESULT=\$(speedtest-cli --json 2>/dev/null)
      if [ -n "$SPEEDTEST_RESULT" ]; then
        SPEEDTEST=\$(echo "$SPEEDTEST_RESULT" | jq '{
          download: .download,
          upload: .upload,
          ping: .ping,
          server: {
            host: .server.host,
            country: .server.country
          },
          timestamp: (now | tostring)
        }')
        
        # Mentjük az utolsó futtatás idejét
        date +%s > "$LAST_SPEEDTEST_FILE"
      fi
    fi
  fi
  
  # Adatok küldése a szerverre
  curl -s -X POST "$API_URL/monitoring/network" \
    -H "Content-Type: application/json" \
    -H "X-API-KEY: $API_KEY" \
    -d "{
      \\"server_id\\": \\"$SERVER_ID\\",
      \\"interfaces\\": $INTERFACES,
      \\"active_connections\\": $ACTIVE_CONNECTIONS,
      \\"ping_results\\": $PING_RESULTS,
      \\"speedtest\\": $SPEEDTEST,
      \\"timestamp\\": \\"\$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\\"
    }" >> "$LOG_FILE" 2>&1
}

# Biztonsági információk gyűjtése
collect_security_info() {
  log_message "Biztonsági információk gyűjtése..."
  
  # Nyitott portok
  OPEN_PORTS="[]"
  PORTS_INFO="{}"
  if command -v netstat &> /dev/null; then
    PORTS_DATA=\$(netstat -tuln | grep LISTEN)
    OPEN_PORTS=\$(echo "$PORTS_DATA" | awk '{print $4}' | awk -F: '{print $NF}' | sort -u | jq -R . | jq -s .)
    
    # Port információk
    PORTS_INFO_JSON=""
    while read -r line; do
      port=\$(echo "$line" | awk '{print $4}' | awk -F: '{print $NF}')
      proc_info=""
      
      # Kísérlet a porthoz tartozó process lekérésére (root jogosultság szükséges lehet)
      if command -v lsof &> /dev/null; then
        proc_info=\$(lsof -i ":$port" | grep LISTEN | awk '{print $1}' | head -n 1)
      fi
      
      if [ -n "$port" ]; then
        if [ -n "$PORTS_INFO_JSON" ]; then
          PORTS_INFO_JSON="$PORTS_INFO_JSON,"
        fi
        PORTS_INFO_JSON="$PORTS_INFO_JSON\\"$port\\": \\"$proc_info\\""
      fi
    done <<< "$PORTS_DATA"
    
    PORTS_INFO="{$PORTS_INFO_JSON}"
  fi
  
  # SSH kapcsolatok
  SSH_CONNECTIONS=0
  SSH_SESSIONS="[]"
  if command -v who &> /dev/null; then
    SSH_DATA=\$(who)
    SSH_CONNECTIONS=\$(echo "$SSH_DATA" | grep -c "pts")
    
    # SSH session információk
    SSH_SESSIONS_JSON=""
    while read -r line; do
      if [[ "$line" == *pts* ]]; then
        user=\$(echo "$line" | awk '{print $1}')
        source=\$(echo "$line" | awk '{print $5}' | tr -d '()')
        login_time=\$(echo "$line" | awk '{print $3 " " $4}')
        
        if [ -n "$SSH_SESSIONS_JSON" ]; then
          SSH_SESSIONS_JSON="$SSH_SESSIONS_JSON,"
        fi
        SSH_SESSIONS_JSON="$SSH_SESSIONS_JSON{
          \\"user\\": \\"$user\\",
          \\"source\\": \\"$source\\",
          \\"login_time\\": \\"$login_time\\",
          \\"duration\\": \\"\$(ps -o etime= -p \$(echo "$line" | awk '{print $7}'))\\""
        }"
      fi
    done <<< "$SSH_DATA"
    
    if [ -n "$SSH_SESSIONS_JSON" ]; then
      SSH_SESSIONS="[$SSH_SESSIONS_JSON]"
    fi
  fi
  
  # Sikertelen bejelentkezési kísérletek
  FAILED_LOGINS="[]"
  if command -v journalctl &> /dev/null; then
    FAILED_LOGINS_DATA=\$(journalctl -u sshd --since "1 day ago" | grep "Failed password")
    FAILED_LOGINS_JSON=""
    
    while read -r line; do
      if [ -n "$line" ]; then
        if [ -n "$FAILED_LOGINS_JSON" ]; then
          FAILED_LOGINS_JSON="$FAILED_LOGINS_JSON,"
        fi
        FAILED_LOGINS_JSON="$FAILED_LOGINS_JSON\\"$line\\""
      fi
    done <<< "$FAILED_LOGINS_DATA"
    
    if [ -n "$FAILED_LOGINS_JSON" ]; then
      FAILED_LOGINS="[$FAILED_LOGINS_JSON]"
    fi
  fi
  
  # Frissítés információk
  UPDATES_AVAILABLE=0
  SECURITY_UPDATES=0
  PENDING_PACKAGES="[]"
  
  if command -v apt &> /dev/null; then
    apt update -qq &>/dev/null
    UPDATES_OUTPUT=\$(apt list --upgradable 2>/dev/null)
    UPDATES_AVAILABLE=\$(echo "$UPDATES_OUTPUT" | grep -c upgradable)
    
    # Biztonsági frissítések (Ubuntu/Debian)
    if command -v unattended-upgrade &> /dev/null; then
      SECURITY_UPDATES=\$(unattended-upgrade --dry-run -d 2>&1 | grep -c 'Packages that will be upgraded')
    fi
    
    # Frissítendő csomagok listája
    PENDING_PACKAGES_JSON=""
    while read -r pkg; do
      if [[ "$pkg" == *"upgradable from"* ]]; then
        name=\$(echo "$pkg" | cut -d/ -f1)
        version=\$(echo "$pkg" | grep -oP 'upgradable from.*to \K[^ ]+')
        
        if [ -n "$PENDING_PACKAGES_JSON" ]; then
          PENDING_PACKAGES_JSON="$PENDING_PACKAGES_JSON,"
        fi
        PENDING_PACKAGES_JSON="$PENDING_PACKAGES_JSON{
          \\"name\\": \\"$name\\",
          \\"version\\": \\"$version\\"
        }"
      fi
    done <<< "$UPDATES_OUTPUT"
    
    if [ -n "$PENDING_PACKAGES_JSON" ]; then
      PENDING_PACKAGES="[$PENDING_PACKAGES_JSON]"
    fi
  elif command -v yum &> /dev/null; then
    UPDATES_AVAILABLE=\$(yum check-update --quiet | grep -v "^$" | wc -l)
    SECURITY_UPDATES=\$(yum --security check-update --quiet | grep -v "^$" | wc -l)
  fi
  
  # Biztonsági audit
  AUDIT_RESULTS="{}"
  
  # 1. Ellenőrizzük a jelszó házirendeket
  PASSWORD_POLICY="passed"
  PASSWORD_MESSAGE="Jelszó szabályzat megfelelő"
  
  if [ -f "/etc/pam.d/common-password" ]; then
    if ! grep -q "minlen=8" /etc/pam.d/common-password; then
      PASSWORD_POLICY="warning"
      PASSWORD_MESSAGE="A jelszavak minimális hossza nincs megfelelően beállítva"
    fi
  fi
  
  # 2. Ellenőrizzük az SSH beállításokat
  SSH_SECURITY="passed"
  SSH_MESSAGE="SSH konfiguráció megfelelő"
  
  if [ -f "/etc/ssh/sshd_config" ]; then
    if grep -q "PermitRootLogin yes" /etc/ssh/sshd_config; then
      SSH_SECURITY="warning"
      SSH_MESSAGE="A root SSH bejelentkezés engedélyezve van"
    fi
    
    if grep -q "PasswordAuthentication yes" /etc/ssh/sshd_config; then
      SSH_SECURITY="warning"
      SSH_MESSAGE="Az SSH jelszavas hitelesítés engedélyezve van"
    fi
  fi
  
  # 3. Ellenőrizzük a tűzfalat
  FIREWALL_STATUS="passed"
  FIREWALL_MESSAGE="Tűzfal megfelelően konfigurálva"
  
  if command -v ufw &> /dev/null; then
    if ! ufw status | grep -q "Status: active"; then
      FIREWALL_STATUS="warning"
      FIREWALL_MESSAGE="A tűzfal (ufw) nincs aktiválva"
    fi
  elif command -v firewalld &> /dev/null; then
    if ! systemctl is-active --quiet firewalld; then
      FIREWALL_STATUS="warning"
      FIREWALL_MESSAGE="A tűzfal (firewalld) nincs aktiválva"
    fi
  else
    FIREWALL_STATUS="warning"
    FIREWALL_MESSAGE="Nem található tűzfal (ufw vagy firewalld)"
  fi
  
  # Audit eredmények összefoglalása
  AUDIT_RESULTS="{
    \\"password_policy\\": {
      \\"status\\": \\"$PASSWORD_POLICY\\",
      \\"message\\": \\"$PASSWORD_MESSAGE\\"
    },
    \\"ssh_security\\": {
      \\"status\\": \\"$SSH_SECURITY\\",
      \\"message\\": \\"$SSH_MESSAGE\\"
    },
    \\"firewall\\": {
      \\"status\\": \\"$FIREWALL_STATUS\\",
      \\"message\\": \\"$FIREWALL_MESSAGE\\"
    }
  }"
  
  # Adatok küldése a szerverre
  curl -s -X POST "$API_URL/monitoring/security" \
    -H "Content-Type: application/json" \
    -H "X-API-KEY: $API_KEY" \
    -d "{
      \\"server_id\\": \\"$SERVER_ID\\",
      \\"open_ports\\": $OPEN_PORTS,
      \\"ports_info\\": $PORTS_INFO,
      \\"active_ssh_connections\\": $SSH_CONNECTIONS,
      \\"ssh_sessions\\": $SSH_SESSIONS,
      \\"failed_login_attempts\\": $FAILED_LOGINS,
      \\"updates_available\\": $UPDATES_AVAILABLE,
      \\"security_updates\\": $SECURITY_UPDATES,
      \\"pending_packages\\": $PENDING_PACKAGES,
      \\"audit_results\\": $AUDIT_RESULTS,
      \\"timestamp\\": \\"\$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\\"
    }" >> "$LOG_FILE" 2>&1
}

# Szerver regisztráció
register_server() {
  log_message "Szerver regisztrálása..." "stdout"
  
  # Hostnév lekérése
  HOSTNAME=\$(hostname)
  
  # IP cím lekérése
  IP_ADDRESS=\$(hostname -I | awk '{print $1}')
  
  # OS információk
  OS_NAME=\$(grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '\"')
  
  # Regisztráció küldése
  RESPONSE=\$(curl -s -X POST "$API_URL/monitoring/register" \
    -H "Content-Type: application/json" \
    -H "X-API-KEY: $API_KEY" \
    -d "{
      \\"server_id\\": \\"$SERVER_ID\\",
      \\"hostname\\": \\"$HOSTNAME\\",
      \\"ip_address\\": \\"$IP_ADDRESS\\",
      \\"os\\": \\"$OS_NAME\\",
      \\"registration_time\\": \\"\$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\\"
    }")
  
  # Válasz ellenőrzése
  if echo "$RESPONSE" | grep -q "success"; then
    log_message "Regisztráció sikeres" "stdout"
    return 0
  else
    log_message "Regisztráció sikertelen: $RESPONSE" "stdout"
    return 1
  fi
}

# Szerviz telepítése
install_service() {
  log_message "Szolgáltatás telepítése..." "stdout"
  
  # Szkript másolása
  cp "$0" /usr/local/bin/nbstudio-monitor.sh
  chmod +x /usr/local/bin/nbstudio-monitor.sh
  
  # Systemd szolgáltatás létrehozása
  cat > /etc/systemd/system/nbstudio-monitor.service << EOF
[Unit]
Description=NB Studio Monitoring Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/nbstudio-monitor.sh --daemon
Restart=always
RestartSec=60

[Install]
WantedBy=multi-user.target
EOF
  
  # Szolgáltatás engedélyezése és indítása
  systemctl daemon-reload
  systemctl enable nbstudio-monitor
  systemctl start nbstudio-monitor
  
  log_message "Szolgáltatás telepítve és elindítva" "stdout"
}

# Daemon mód
run_daemon() {
  log_message "Monitoring daemon indítása..."
  
  # Regisztráció és adatgyűjtés indítása
  register_server
  
  while true; do
    collect_system_info
    collect_network_info
    
    # Biztonsági adatokat csak minden 10. alkalommal (kb. óránként) gyűjtünk
    if [ $((SECONDS % 600)) -lt 60 ]; then
      collect_security_info
    fi
    
    # Várakozás a következő adatgyűjtésig
    sleep $COLLECTION_INTERVAL
  done
}

# Fő program
# Ellenőrizzük, hogy a szükséges programok telepítve vannak-e
check_dependencies() {
  log_message "Függőségek ellenőrzése..." "stdout"
  
  MISSING_DEPS=""
  
  for cmd in curl jq bc; do
    if ! command -v $cmd &> /dev/null; then
      MISSING_DEPS="$MISSING_DEPS $cmd"
    fi
  done
  
  if [ -n "$MISSING_DEPS" ]; then
    log_message "Hiányzó függőségek:$MISSING_DEPS" "stdout"
    log_message "Függőségek telepítése..." "stdout"
    
    # Csomagkezelő detektálása
    if command -v apt-get &> /dev/null; then
      apt-get update
      apt-get install -y $MISSING_DEPS
    elif command -v yum &> /dev/null; then
      yum install -y $MISSING_DEPS
    elif command -v dnf &> /dev/null; then
      dnf install -y $MISSING_DEPS
    else
      log_message "Nem sikerült a függőségek telepítése. Kérjük, telepítse manuálisan:$MISSING_DEPS" "stdout"
      return 1
    fi
  fi
  
  log_message "Minden függőség rendelkezésre áll" "stdout"
  return 0
}

# Ellenőrizzük a paramétereket
case "$1" in
  --install)
    # Függőségek ellenőrzése és telepítése
    check_dependencies || exit 1
    
    # Szolgáltatás telepítése
    install_service
    ;;
    
  --daemon)
    # Daemon mód indítása
    run_daemon
    ;;
    
  --test)
    # Teszt mód - egyszer futtatjuk az adatgyűjtést
    register_server && collect_system_info && collect_network_info && collect_security_info
    ;;
    
  *)
    echo "Használat: $0 [--install|--daemon|--test]"
    echo ""
    echo "  --install      Monitoring szolgáltatás telepítése"
    echo "  --daemon      Monitoring szolgáltatás indítása daemon módban"
    echo "  --test        Teszt adatgyűjtés"
    exit 1
    ;;
esac

exit 0
`;

  res.set('Content-Type', 'text/plain');
  res.send(monitorScript);
});

export default router;