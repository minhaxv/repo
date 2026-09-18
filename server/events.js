/**
 * High-Performance Server-Sent Events (SSE) Real-Time Bus
 * Broadcasts operational ERP events to all connected workstations and tablets
 */

const clients = new Set();

export function sseHandler(req, res) {
  // Set SSE mandatory headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no' // Prevents Nginx/proxy buffer delay
  });

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const client = { id: clientId, res };
  clients.add(client);

  console.log(`🔌 [SSE] Workstation connected (${clientId}). Active connections: ${clients.size}`);

  // Send initial handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, timestamp: new Date().toISOString() })}\n\n`);

  // Send periodic keep-alive heartbeat every 25 seconds
  const heartbeat = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client);
    console.log(`🔌 [SSE] Workstation disconnected (${clientId}). Remaining: ${clients.size}`);
  });
}

export function publishEvent(type, payload = {}) {
  const message = `data: ${JSON.stringify({
    type,
    payload,
    timestamp: new Date().toISOString()
  })}\n\n`;

  console.log(`📡 [SSE Broadcast] ${type} to ${clients.size} workstations`);

  for (const client of clients) {
    try {
      client.res.write(message);
    } catch (err) {
      console.error(`Failed to send event to ${client.id}:`, err);
      clients.delete(client);
    }
  }
}

export function getActiveConnectionCount() {
  return clients.size;
}
