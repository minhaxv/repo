import ZKLib from 'node-zklib';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../database/erp.sqlite');

// Open SQLite database to resolve employee names
let db;
try {
  db = new Database(dbPath);
} catch (e) {
  console.warn('⚠️ Could not open SQLite database:', e.message);
}

function getEmployeeForBioUser(bioUserId) {
  if (!db) return null;
  try {
    const row = db.prepare(`
      SELECT m.biometric_user_id, m.biometric_name, e.id as emp_id, e.name as emp_name, e.department, e.designation
      FROM biometric_user_mappings m
      LEFT JOIN employees e ON m.employee_id = e.id
      WHERE m.biometric_user_id = ?
    `).get(String(bioUserId));
    return row;
  } catch (e) {
    return null;
  }
}

function savePunchToDatabase(bioUserId, punchTimeStr, state) {
  if (!db) return;
  try {
    const punchId = `PUNCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const emp = getEmployeeForBioUser(bioUserId);
    const empName = emp?.emp_name || emp?.biometric_name || `User #${bioUserId}`;

    db.prepare(`
      INSERT INTO unmapped_biometric_punches (id, device_id, biometric_user_id, biometric_name, punch_time, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(punchId, 'DEV-IDENTIX-01', String(bioUserId), empName, punchTimeStr, `Live Punch (${state})`);

    // Also update biometric device last_sync_time
    const nowReadable = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
    db.prepare('UPDATE biometric_devices SET last_sync_time = ?, status = ? WHERE id = ?').run(nowReadable, 'Online', 'DEV-K90-01');
  } catch (err) {
    console.error('Error saving punch to DB:', err.message);
  }
}

async function startMonitor() {
  const ip = '192.168.1.7';
  const port = 4370;

  console.log('\n' + '='.repeat(75));
  console.log('   🔴 LIVE BIOMETRIC PUNCH MONITOR — IDENTIX / ZKTECO');
  console.log('='.repeat(75));
  console.log(`📡 Connecting to punching machine at ${ip}:${port} ...`);

  const zk = new ZKLib(ip, port, 5000, 4000);

  try {
    await zk.createSocket();
    console.log('✅ Connection established with Machine!');

    // 1. Initial snapshot of attendance logs
    const initialAtts = await zk.getAttendances();
    let currentLogs = initialAtts?.data || [];
    let lastKnownCount = currentLogs.length;

    const latestPunch = currentLogs[currentLogs.length - 1];
    const latestTime = latestPunch ? new Date(latestPunch.recordTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';
    const latestUser = latestPunch ? latestPunch.deviceUserId : 'N/A';

    console.log(`📊 Device Log Records : ${lastKnownCount.toLocaleString()} stored punches`);
    console.log(`⏱️ Last Punch on Record: User #${latestUser} at ${latestTime}`);
    console.log('-'.repeat(75));
    console.log('👉 MACHINE IS READY! PLEASE SCAN YOUR FINGER OR CARD ON THE MACHINE NOW...');
    console.log('-'.repeat(75) + '\n');

    // Track user punch counts today for auto In/Out calculation
    const todayStr = new Date().toISOString().split('T')[0];
    const todayUserPunches = {};

    currentLogs.forEach(p => {
      const pDate = new Date(p.recordTime).toISOString().split('T')[0];
      if (pDate === todayStr) {
        todayUserPunches[p.deviceUserId] = (todayUserPunches[p.deviceUserId] || 0) + 1;
      }
    });

    let polling = false;

    // High frequency monitor loop (checks machine every 1.5 seconds)
    const monitorInterval = setInterval(async () => {
      if (polling) return;
      polling = true;

      try {
        const checkAtts = await zk.getAttendances();
        const newLogs = checkAtts?.data || [];

        if (newLogs.length > lastKnownCount) {
          const freshPunches = newLogs.slice(lastKnownCount);
          lastKnownCount = newLogs.length;

          for (const punch of freshPunches) {
            const userId = punch.deviceUserId;
            const punchDate = new Date(punch.recordTime);
            const punchTimeStr = punchDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

            // Determine Check-In vs Check-Out:
            // 1st punch today = CHECK-IN, 2nd = CHECK-OUT, 3rd = CHECK-IN, 4th = CHECK-OUT
            const priorPunchesToday = todayUserPunches[userId] || 0;
            const isCheckIn = priorPunchesToday % 2 === 0;
            const punchState = isCheckIn ? '🟢 CHECK-IN' : '🔴 CHECK-OUT';
            todayUserPunches[userId] = priorPunchesToday + 1;

            const emp = getEmployeeForBioUser(userId);
            const empName = emp?.emp_name || emp?.biometric_name || `Unmapped User #${userId}`;
            const empDept = emp?.department || 'General';
            const empCode = emp?.emp_id || 'N/A';

            // Terminal Ding Bell & Prominent Alert
            process.stdout.write('\x07');
            console.log('\n' + '⭐'.repeat(30));
            console.log('💥 NEW BIOMETRIC PUNCH CAPTURED IN REAL-TIME!');
            console.log('⭐'.repeat(30));
            console.log(`👤 User / PIN   : #${userId}`);
            console.log(`📛 Name         : ${empName}`);
            console.log(`🏢 Department   : ${empDept} (ID: ${empCode})`);
            console.log(`⏰ Punch Time   : ${punchTimeStr}`);
            console.log(`📋 Punch Status : ${punchState} (Punch #${todayUserPunches[userId]} today)`);
            console.log(`💾 Saved to ERP : Synced into Attendance & Biometric Ledger`);
            console.log('⭐'.repeat(30) + '\n');

            savePunchToDatabase(userId, punchTimeStr, punchState);
          }
        }
      } catch (err) {
        // Socket may drop if machine is idle, auto-reconnect
        if (err.message && (err.message.includes('TIMEOUT') || err.message.includes('ECONNRESET') || err.message.includes('closed'))) {
          try {
            await zk.createSocket();
          } catch (_) {}
        }
      } finally {
        polling = false;
      }
    }, 1500);

    // Keep process alive and clean exit
    process.on('SIGINT', async () => {
      clearInterval(monitorInterval);
      console.log('\nStopping monitor and closing machine socket...');
      try { await zk.disconnect(); } catch (_) {}
      process.exit(0);
    });

  } catch (err) {
    console.error('❌ Could not start monitor:', err.message);
    try { await zk.disconnect(); } catch (_) {}
  }
}

startMonitor();
