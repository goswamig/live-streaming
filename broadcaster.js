const ws = new WebSocket('ws://localhost:3000'); // Ensure WebSocket URL matches your server
const videoElement = document.getElementById('video');
let peerConnection;

ws.onopen = () => {
    console.log("Broadcaster");
    console.log('Broadcaster Connected to the signaling server');
    ws.send(JSON.stringify({ type: 'broadcast' })); // Identify as the broadcaster
   
};

ws.onerror = (error) => {
    console.error('WebSocket Error:', error);
};

ws.onmessage = async (message) => {
    try {
        if (message.data instanceof Blob) {
            console.log('Received Blob message');
            message.data.text().then((text) => {
                const data = JSON.parse(text);
                handleSignal(data);
            }).catch((error) => {
                console.error('Error reading blob as text:', error);
            });
        } else {
            console.log('Raw message received:', message.data);
            const data = JSON.parse(message.data);
            handleSignal(data);
        }
    } catch (error) {
        console.error('Error handling message from WS:', error);
    }
};

function handleSignal(data) {
    if (data.type === 'answer') {
        console.log('Received answer:', data);
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.type === 'candidate') {
        console.log('Adding ICE candidate:', data);
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
            .catch(e => console.error('Error adding received ICE candidate:', e));
    }
}

async function startBroadcasting() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("MediaDevices API or getUserMedia not supported in this browser.");
        alert("MediaDevices API or getUserMedia not supported in this browser.");
        return;
    }

    peerConnection = createPeerConnection();

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
        videoElement.srcObject = stream;
    } catch (error) {
        console.error('Error accessing media devices:', error);
    }
}

function createPeerConnection() {
    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = event => {
        if (event.candidate) {
            console.log('Sending ICE candidate:', event.candidate);
            ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
    };

    pc.oniceconnectionstatechange = event => {
        console.log(`ICE connection state: ${pc.iceConnectionState}`);
    };

    pc.onconnectionstatechange = event => {
        console.log(`Connection state: ${pc.connectionState}`);
        if (pc.connectionState === "connected") {
            console.log("Broadcasting is live");
        }
    };

    pc.onnegotiationneeded = async () => {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log('Sending offer:', offer);
            ws.send(JSON.stringify({ type: 'offer', offer: offer }));
        } catch (error) {
            console.error('Failed to create offer:', error);
        }
    };

    return pc;
}

