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

// ============================================================
// NYILVÁNOS VÉGPONTOK - NEM VÉDETT AUTH-MIDDLEWARE-REL
// ============================================================

// Telepítő szkript letöltése
router.get('/install.sh', (req, res) => {
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
router.get('/server_monitor.sh', (req, res) => {
  // Az eredeti monitorozó szkript fájl elérése és küldése
  
  const monitorScript = `#!/bin/bash
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

# Fájllétezés ellenőrzése
if [ -f "\${CONFIG_FILE}" ]; then
  source "\${CONFIG_FILE}"
fi

if [ -z "\${SERVER_ID}" ]; then
  if [ -n "\$1" ] && [ "\$1" != "--install" ]; then
    SERVER_ID="\$1"
  else
    echo "Hiba: Nincs SERVER_ID beállítva! Használat: \$0 <server_id>"
    echo "Vagy állítsd be a SERVER_ID-t a \${CONFIG_FILE} fájlban."
    exit 1
  fi
fi

# Biztosítjuk, hogy a log könyvtár létezik
mkdir -p \$(dirname "\${LOG_FILE}")
touch "\${LOG_FILE}"

# Telepítési mód ellenőrzése
if [ "\$1" == "--install" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Telepítés indítása a következő server ID-val: \${SERVER_ID}" >> "\${LOG_FILE}"
  
  # Rendszer információk gyűjtése
  HOSTNAME=\$(hostname)
  OS=\$(cat /etc/os-release | grep PRETTY_NAME | cut -d '"' -f 2)
  IP_ADDRESS=\$(hostname -I | awk '{print \$1}')
  
  # Szerver regisztrálása
  echo "Szerver regisztrálása..."
  curl -s -X POST "\${API_URL}/register" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: \${API_KEY}" \
    -d "{
      \"server_id\": \"\${SERVER_ID}\",
      \"hostname\": \"\${HOSTNAME}\",
      \"os\": \"\${OS}\",
      \"ip_address\": \"\${IP_ADDRESS}\",
      \"registration_time\": \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }" >> "\${LOG_FILE}" 2>&1
  
  # Cron job létrehozása (5 percenként)
  CRON_JOB="*/5 * * * * /bin/bash /tmp/server_monitor.sh"
  (crontab -l 2>/dev/null | grep -v "/bin/bash /tmp/server_monitor.sh"; echo "\${CRON_JOB}") | crontab -
  
  # Systemd service létrehozása
  cat > /etc/systemd/system/nbstudio-monitor.service << EOL
[Unit]
Description=NB Studio Server Monitoring Agent
After=network.target

[Service]
Type=simple
ExecStart=/bin/bash /tmp/server_monitor.sh
Restart=always
RestartSec=300

[Install]
WantedBy=multi-user.target
EOL

  # Service aktiválása
  systemctl daemon-reload
  systemctl enable nbstudio-monitor.service
  systemctl start nbstudio-monitor.service
  
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Monitoring szolgáltatás telepítve és elindítva" >> "\${LOG_FILE}"
  exit 0
fi

# =====================================
# Adatgyűjtő funkciók
# =====================================

collect_system_info() {
  # CPU információk
  CPU_MODEL=\$(cat /proc/cpuinfo | grep 'model name' | head -1 | cut -d ':' -f 2 | xargs)
  CPU_CORES=\$(grep -c ^processor /proc/cpuinfo)
  CPU_USAGE=\$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - \$1}')
  CPU_LOAD=\$(cat /proc/loadavg | awk '{print \$1,\$2,\$3}')
  
  # Memória információk
  MEM_INFO=\$(free -m)
  MEM_TOTAL=\$(echo "\${MEM_INFO}" | grep Mem | awk '{print \$2}')
  MEM_USED=\$(echo "\${MEM_INFO}" | grep Mem | awk '{print \$3}')
  MEM_FREE=\$(echo "\${MEM_INFO}" | grep Mem | awk '{print \$4}')
  MEM_PERCENT=\$(echo "scale=2; \${MEM_USED} * 100 / \${MEM_TOTAL}" | bc)
  
  # Swap információk
  SWAP_TOTAL=\$(echo "\${MEM_INFO}" | grep Swap | awk '{print \$2}')
  SWAP_USED=\$(echo "\${MEM_INFO}" | grep Swap | awk '{print \$3}')
  
  # Lemez információk
  DISK_INFO=\$(df -h / | awk 'NR==2 {print \$2,\$3,\$4,\$5}')
  DISK_TOTAL=\$(echo "\${DISK_INFO}" | awk '{print \$1}')
  DISK_USED=\$(echo "\${DISK_INFO}" | awk '{print \$2}')
  DISK_FREE=\$(echo "\${DISK_INFO}" | awk '{print \$3}')
  DISK_PERCENT=\$(echo "\${DISK_INFO}" | awk '{print \$4}' | tr -d '%')
  
  # IO latency
  IO_LATENCY=\$(dd if=/dev/zero of=/tmp/io_test bs=512 count=1000 oflag=dsync 2>&1 | grep sec | awk '{print \$NF}')
  rm -f /tmp/io_test
  
  # Disks detail
  DISKS_DETAIL=\$(lsblk -J)
  
  # Uptime
  UPTIME=\$(uptime -p)
  
  # JSON formátumba konvertálás
  echo "{
    \"cpu\": {
      \"model\": \"\${CPU_MODEL}\",
      \"cores\": \${CPU_CORES},
      \"usage_percent\": \${CPU_USAGE},
      \"load\": \"\${CPU_LOAD}\"
    },
    \"memory\": {
      \"total_mb\": \${MEM_TOTAL},
      \"used_mb\": \${MEM_USED},
      \"free_mb\": \${MEM_FREE},
      \"usage_percent\": \${MEM_PERCENT}
    },
    \"swap\": {
      \"total_mb\": \${SWAP_TOTAL},
      \"used_mb\": \${SWAP_USED}
    },
    \"disk\": {
      \"total\": \"\${DISK_TOTAL}\",
      \"used\": \"\${DISK_USED}\",
      \"free\": \"\${DISK_FREE}\",
      \"usage_percent\": \${DISK_PERCENT},
      \"io_latency_ms\": \"\${IO_LATENCY}\",
      \"disks_detail\": \${DISKS_DETAIL}
    },
    \"uptime\": \"\${UPTIME}\"
  }"
}

collect_network_info() {
  # Alap hálózati interfészek
  INTERFACES=\$(ip -j addr)
  
  # Speedtest (ha van telepítve)
  if command -v speedtest-cli &> /dev/null; then
    SPEEDTEST=\$(speedtest-cli --json)
    SPEEDTEST_DOWNLOAD=\$(echo "\${SPEEDTEST}" | grep -o '"download": [0-9]*' | awk '{print \$2}')
    SPEEDTEST_UPLOAD=\$(echo "\${SPEEDTEST}" | grep -o '"upload": [0-9]*' | awk '{print \$2}')
    SPEEDTEST_PING=\$(echo "\${SPEEDTEST}" | grep -o '"ping": [0-9.]*' | awk '{print \$2}')
    SPEEDTEST_SERVER=\$(echo "\${SPEEDTEST}" | grep -o '"host": "[^"]*"' | cut -d '"' -f 4)
    SPEEDTEST_LOCATION=\$(echo "\${SPEEDTEST}" | grep -o '"sponsor": "[^"]*"' | cut -d '"' -f 4)
  fi
  
  # Ping eredmények
  declare -A PING_RESULTS
  for host in "\${PING_HOSTS[@]}"; do
    ping_result=\$(ping -c 3 "\${host}" | tail -1 | awk '{print \$4}' | cut -d '/' -f 2)
    PING_RESULTS[\${host}]=\${ping_result}
  done
  
  # JSON formátumba konvertálás
  PING_JSON="{"
  for host in "\${!PING_RESULTS[@]}"; do
    PING_JSON+="\\"\\"\${host}\\": \${PING_RESULTS[\${host}]},"
  done
  PING_JSON=\${PING_JSON%,}
  PING_JSON+="}"
  
  # Van-e speedtest eredmény
  if [ -n "\${SPEEDTEST_DOWNLOAD}" ]; then
    echo "{
      \"interfaces\": \${INTERFACES},
      \"speedtest\": {
        \"download\": \${SPEEDTEST_DOWNLOAD},
        \"upload\": \${SPEEDTEST_UPLOAD},
        \"ping\": \${SPEEDTEST_PING},
        \"server\": {
          \"host\": \"\${SPEEDTEST_SERVER}\",
          \"location\": \"\${SPEEDTEST_LOCATION}\"
        }
      },
      \"ping_results\": \${PING_JSON}
    }"
  else
    echo "{
      \"interfaces\": \${INTERFACES},
      \"ping_results\": \${PING_JSON}
    }"
  fi
}

collect_security_info() {
  # Nyitott portok
  OPEN_PORTS=\$(ss -tuln | grep LISTEN | awk '{print \$5}' | cut -d ':' -f 2 | tr '\n' ',' | sed 's/,$//')
  
  # Aktív SSH kapcsolatok
  SSH_CONNECTIONS=\$(who | grep -c pts)
  
  # Sikertelen bejelentkezési kísérletek
  FAILED_LOGINS=\$(grep "Failed password" /var/log/auth.log 2>/dev/null | tail -5 | tr '\n' '|' | sed 's/|$//')
  if [ -z "\${FAILED_LOGINS}" ]; then
    FAILED_LOGINS=\$(grep "Failed password" /var/log/secure 2>/dev/null | tail -5 | tr '\n' '|' | sed 's/|$//')
  fi
  
  # Elérhető frissítések
  if command -v apt-get &> /dev/null; then
    apt-get update -qq > /dev/null
    UPDATES=\$(apt-get --simulate upgrade | grep -c ^Inst)
    SECURITY_UPDATES=\$(apt-get --simulate upgrade | grep -c "security")
  elif command -v yum &> /dev/null; then
    UPDATES=\$(yum check-update --quiet | grep -v "^$" | wc -l)
    SECURITY_UPDATES=\$(yum updateinfo list sec | grep -c update)
  else
    UPDATES="0"
    SECURITY_UPDATES="0"
  fi
  
  # JSON formátumba konvertálás
  FAILED_LOGINS_JSON="[\\"\\$(echo \${FAILED_LOGINS} | sed 's/|/\\",\\"/g')\\"]"
  OPEN_PORTS_JSON="[\\"\\$(echo \${OPEN_PORTS} | sed 's/,/\\",\\"/g')\\"]"
  
  echo "{
    \"open_ports\": \${OPEN_PORTS_JSON},
    \"active_ssh_connections\": \${SSH_CONNECTIONS},
    \"failed_login_attempts\": \${FAILED_LOGINS_JSON},
    \"updates_available\": \"\${UPDATES}\",
    \"security_updates\": \"\${SECURITY_UPDATES}\"
  }"
}

# =====================================
# Adatok küldése
# =====================================

# System info küldése
SYSTEM_INFO=\$(collect_system_info)
curl -s -X POST "\${API_URL}/system" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: \${API_KEY}" \
  -d "{
    \"server_id\": \"\${SERVER_ID}\",
    \"system_info\": \${SYSTEM_INFO},
    \"timestamp\": \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }" >> "\${LOG_FILE}" 2>&1

# Network info küldése (ritkábban, ezért feltételesen)
if [ \$((\$RANDOM % 5)) -eq 0 ]; then
  NETWORK_INFO=\$(collect_network_info)
  curl -s -X POST "\${API_URL}/network" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: \${API_KEY}" \
    -d "{
      \"server_id\": \"\${SERVER_ID}\",
      \"speedtest\": \$(echo \${NETWORK_INFO} | jq '.speedtest // {}'),
      \"ping\": \$(echo \${NETWORK_INFO} | jq '.ping_results // {}'),
      \"timestamp\": \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }" >> "\${LOG_FILE}" 2>&1
fi

# Security info küldése (naponta egyszer)
if [ \$(date +%H) -eq 3 ] && [ \$(date +%M) -lt 15 ]; then
  SECURITY_INFO=\$(collect_security_info)
  curl -s -X POST "\${API_URL}/security" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: \${API_KEY}" \
    -d "{
      \"server_id\": \"\${SERVER_ID}\",
      \"open_ports\": \$(echo \${SECURITY_INFO} | jq '.open_ports // []'),
      \"active_ssh_connections\": \$(echo \${SECURITY_INFO} | jq '.active_ssh_connections // 0'),
      \"failed_login_attempts\": \$(echo \${SECURITY_INFO} | jq '.failed_login_attempts // []'),
      \"updates_available\": \"\$(echo \${SECURITY_INFO} | jq -r '.updates_available // "0"')\",
      \"security_updates\": \"\$(echo \${SECURITY_INFO} | jq -r '.security_updates // "0"')\",
      \"timestamp\": \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }" >> "\${LOG_FILE}" 2>&1
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - Adatok sikeresen elküldve" >> "\${LOG_FILE}"
`;
  
  res.set('Content-Type', 'text/plain');
  res.send(monitorScript);
});

// ============================================================
// PUBLIKUS, DE API KULCS ÁLTAL VÉDETT VÉGPONTOK
// ============================================================

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

// Rendszer információk fogadása
router.post('/system', validateMonitorApiKey, async (req, res) => {
  try {
    const { server_id, system_info, timestamp } = req.body;
    
    // Szerver keresése az adatbázisban
    let server = await ServerMonitor.findOne({ server_id });
    
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Szerver nem található, először regisztrálja'
      });
    }
    
    // Rendszer információk frissítése
    server.system_info = system_info;
    server.uptime = system_info.uptime;
    server.last_seen = new Date();
    server.status = 'online';
    
    // Historikus adatok frissítése
    server.history.push({
      timestamp: new Date(timestamp) || new Date(),
      cpu_usage: system_info.cpu?.usage_percent,
      memory_usage: system_info.memory?.usage_percent,
      disk_usage: system_info.disk?.usage_percent
    });
    
    // Limitáljuk a historikus adatok számát (pl. utolsó 100)
    if (server.history.length > 100) {
      server.history = server.history.slice(-100);
    }
    
    // Riasztások generálása, ha szükséges
    await generateAlerts(server);
    
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

// ============================================================
// VÉDETT VÉGPONTOK - CSAK BEJELENTKEZETT FELHASZNÁLÓKNAK
// ============================================================

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

export default router;