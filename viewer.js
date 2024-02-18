const ws = new WebSocket('ws://localhost:3000'); // Ensure WebSocket URL matches your server
const videoElement = document.getElementById('video');
let peerConnection;

ws.onopen = () => {
    console.log('Connected to the signaling server');
};

ws.onerror = (error) => {
    console.error('WebSocket Error:', error);
};

ws.onmessage = async (message) => {
    try {
        // Check if the message data is a Blob
        if (message.data instanceof Blob) {
            console.log('Received Blob message');
            message.data.text().then((text) => {
                const data = JSON.parse(text);
                handleSignal(data);
            }).catch((error) => {
                console.error('Error reading blob as text:', error);
            });
        } else {
            // Assume the message data is already a text-based JSON string
            console.log('Raw message received:', message.data);
            const data = JSON.parse(message.data);
            handleSignal(data);
        }
    } catch (error) {
        console.error('Error handling message from WS:', error);
    }
};

function handleSignal(data) {
    if (!peerConnection) peerConnection = createPeerConnection();

    if (data.type === 'offer') {
        console.log('Received offer:', data);
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
            .then(() => peerConnection.createAnswer())
            .then((answer) => peerConnection.setLocalDescription(answer))
            .then(() => {
                ws.send(JSON.stringify({ type: 'answer', answer: peerConnection.localDescription }));
            })
            .catch((error) => console.error('Error during offer-answer negotiation:', error));
    } else if (data.type === 'candidate') {
        console.log('Adding ICE candidate:', data);
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
            .catch((error) => console.error('Error adding received ICE candidate:', error));
    }
};

function createPeerConnection() {
    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.ontrack = (event) => {
        console.log('Stream received:', event.streams[0]);
        videoElement.srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('Sending ICE candidate:', event.candidate);
            ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
    };

    pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state change: ${pc.iceConnectionState}`);
    };

    pc.onconnectionstatechange = () => {
        console.log(`Connection state change: ${pc.connectionState}`);
        if (pc.connectionState === "connected") {
            console.log("Peering connection established successfully.");
        }
    };

    pc.onicecandidateerror = (error) => {
        console.error('ICE candidate error:', error);
    };

    return pc;
}
