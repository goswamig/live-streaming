const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

let broadcaster;
const viewers = new Map(); // Use a Map to track viewers by their WebSocket

wss.on('connection', function connection(ws) {
  console.log("Server")
    console.log("A new client connected.");

    ws.on('message', function incoming(message) {
        const parsedMessage = JSON.parse(message);

        if (parsedMessage.type === 'broadcast') {
            broadcaster = ws; // Save the broadcaster socket
            console.log("Broadcaster connected.");
        } else {
            // Assume any other connection is a viewer
            viewers.set(ws, parsedMessage.viewerId); // Optionally track viewers by an ID
        }

        // Forward messages between broadcaster and viewers
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', function close() {
        console.log('Client disconnected');
        if (broadcaster === ws) {
            broadcaster = null; // Clear the broadcaster if they disconnect
            console.log("Broadcaster disconnected.");
        } else {
            viewers.delete(ws); // Remove the viewer from tracking
        }
    });

    ws.on('error', function error(err) {
        console.error('WebSocket error:', err);
    });
});


console.log('Signaling server running on ws://localhost:3000');

