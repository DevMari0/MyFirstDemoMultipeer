"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class webRtcClient {
    constructor(username) {
        this.peerConnection = new Map();
        this.localStream = null;
        this.ws = null;
        this.partecipants = new Map();
        console.log('initialize websocket for user ', username);
        this.username = username;
        this.videoGrid = document.getElementById('video');
        this.initialize();
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            const wsUrl = 'wss://localhost:3010';
            this.ws = new WebSocket(wsUrl);
            this.ws.onopen = () => {
                console.log('websocket connessione aperta');
                this.sendMessage({ type: 'new-user' });
            };
            this.ws.onmessage = (event) => __awaiter(this, void 0, void 0, function* () {
                const message = JSON.parse(event.data);
                console.log('messaggio ricevuto da signaling ', message);
                switch (message.type) {
                    case 'join-call':
                        yield this.handleIncomingCall(message.sender);
                        break;
                    case 'new-participant':
                        yield this.handleIncomingCall(message.sender);
                        console.log(` esco da handleIncomingCall per  ${message.sender}`);
                        message.participants.forEach((partecipant) => __awaiter(this, void 0, void 0, function* () {
                            console.log(` Creando connessione con nuovo utente: ${partecipant}`);
                            if (partecipant !== this.username && !this.partecipants.has(partecipant)) {
                                console.log(` partecipant create connection: ${partecipant}`);
                                yield this.createPeerConnection(partecipant);
                            }
                        }));
                        break;
                    case 'session-ended':
                        this.handleSessionEnded(message);
                        break;
                    case 'offer':
                        yield this.handleOffer(message.sender, message.payload);
                        break;
                    case 'answer':
                        yield this.handleAnswer(message.sender, message.payload);
                        break;
                    case 'ice-candidate':
                        yield this.handleIceCandidate(message.sender, message.payload);
                        break;
                    default:
                        break;
                }
            });
        });
    }
    handleOffer(username, offer) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.startStream();
            const peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
            peerConnection.ontrack = ({ streams }) => {
                if (streams[0]) {
                    const existVideo = document.querySelector(`video[data-username="${username}"]`);
                    if (!existVideo) {
                        console.log('streams ricevuto => streams[0]', streams[0]);
                        this.addVideoStream(username, this.localStream);
                    }
                }
            };
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => peerConnection.addTrack(track, this.localStream));
            }
            yield peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = yield peerConnection.createAnswer();
            yield peerConnection.setLocalDescription(answer);
            this.peerConnection.set(username, peerConnection);
            this.sendMessage({ type: "answer", receiver: username, payload: answer });
        });
    }
    handleIceCandidate(username, candidate) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('recive ice candidate', candidate);
            const peerConnection = this.peerConnection.get(username);
            if (peerConnection) {
                yield peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
            else {
                console.log('no peer for canidate', username);
            }
        });
    }
    handleAnswer(username, answer) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('handle answer', answer);
            const peerConnection = this.peerConnection.get(username);
            if (peerConnection) {
                yield peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });
    }
    handleIncomingCall(sender) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.startStream();
            if (!this.partecipants.has(sender)) {
                this.partecipants.set(sender, { connected: false });
                console.log('partecipante aggiunto ', sender);
            }
            this.partecipants.forEach((value, key) => {
                if (key !== sender && !value.connected) {
                    console.log('createPeerConnection per  ', sender);
                    this.createPeerConnection(key);
                }
            });
            yield this.createPeerConnection(sender);
        });
    }
    createPeerConnection(username) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.peerConnection.has(username)) {
                console.log('peerConnection per  ', username, 'esiste gia');
                return;
            }
            const peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            console.log('creato createPeerConnection per  ', username);
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => peerConnection.addTrack(track, this.localStream));
            }
            peerConnection.ontrack = ({ streams }) => {
                if (streams[0]) {
                    console.log('streams ricevuto =)> streams[0]', streams[0]);
                    this.addVideoStream(username, this.localStream); // se non in locale stream[0]
                }
            };
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('invio candidate per ', username, 'candidate ', event.candidate);
                    this.sendMessage({ type: "ice-candidate", receiver: username, payload: event.candidate });
                }
            };
            this.peerConnection.set(username, peerConnection);
            const offer = yield peerConnection.createOffer();
            yield peerConnection.setLocalDescription(offer);
            this.sendMessage({ type: "offer", receiver: username, payload: offer });
        });
    }
    handleSessionEnded(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = message.user;
            if (user) {
                this.partecipants.delete(user);
                const videoContainer = document.getElementById(`video-${user}`);
                if (videoContainer && videoContainer.parentNode) {
                    videoContainer.parentNode.removeChild(videoContainer);
                }
            }
        });
    }
    sendMessage(message) {
        var _a;
        console.log('stope rinviare questo message', message);
        if (((_a = this.ws) === null || _a === void 0 ? void 0 : _a.readyState) === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(Object.assign({ username: this.username }, message)));
        }
    }
    startCall(targetUsername) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.startStream();
            this.sendMessage({ type: 'join-call', sender: this.username, receiver: targetUsername });
        });
    }
    startStream() {
        return __awaiter(this, void 0, void 0, function* () {
            this.localStream = yield navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            console.log('localStream', this.localStream);
            this.addVideoStream(this.username, this.localStream);
        });
    }
    addVideoStream(username, stream) {
        return __awaiter(this, void 0, void 0, function* () {
            if (document.querySelector(`#video-${username}`))
                return;
            console.log('addVideoStream', username, stream);
            const container = document.createElement('div');
            container.id = `video-${username}`;
            const video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            video.muted = true;
            video.srcObject = stream;
            console.log('aggiungo video');
            const usernameLabel = document.createElement('div');
            usernameLabel.textContent = username === this.username ? 'tu' : username;
            container.appendChild(video);
            container.appendChild(usernameLabel);
            this.videoGrid.appendChild(container);
        });
    }
    cleanup() {
        var _a, _b;
        this.peerConnection.forEach((pc) => pc.close());
        this.peerConnection.clear();
        (_a = this.localStream) === null || _a === void 0 ? void 0 : _a.getTracks().forEach((track) => track.stop());
        this.localStream = null;
        (_b = this.ws) === null || _b === void 0 ? void 0 : _b.close;
    }
}
let webRTCClient = null;
function handleLogin() {
    return __awaiter(this, void 0, void 0, function* () {
        const username = document.getElementById('username');
        const password = document.getElementById('password');
        console.log('username:', username.value, 'password:', password.value);
        try {
            const response = yield fetch("https://localhost:3010/api/login", {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ username: username.value, password: password.value }),
                credentials: 'include'
            });
            const res = yield response.json();
            if (response.ok) {
                console.log('login effettuato con successo', res);
                document.getElementById('loginForm').style.display = 'none';
                document.getElementById('callInterface').style.display = 'block';
                document.getElementById('user').innerHTML = `UTENTE: ${res.user.username}`;
                webRTCClient = new webRtcClient(res.user.username);
            }
        }
        catch (error) {
            console.error('error handle login', error);
        }
    });
}
function startCall() {
    const peerUsername = document.getElementById('peerUsername');
    console.log('peerUsername', peerUsername.value);
    if (webRTCClient && peerUsername) {
        webRTCClient.startCall(peerUsername.value);
    }
}
function logout() {
    return __awaiter(this, void 0, void 0, function* () {
        webRTCClient === null || webRTCClient === void 0 ? void 0 : webRTCClient.sendMessage({ type: 'leave-call' });
        webRTCClient === null || webRTCClient === void 0 ? void 0 : webRTCClient.cleanup();
        yield fetch('https://localhost:3010/api/logout', { method: "POST", credentials: 'include' });
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('callInterface').style.display = 'none';
    });
}
