
class webRtcClient {
    private peerConnection: Map<string, RTCPeerConnection> = new Map()
    private localStream: MediaStream | null = null
    private ws: WebSocket | null = null
    private partecipants: Map<string, { connected: boolean, stream?: MediaStream }> = new Map()
    private username: string
    private videoGrid: HTMLElement

    constructor(username: string) {
        console.log('initialize websocket for user ', username)
        this.username = username
        this.videoGrid = document.getElementById('video')!
        this.initialize()
    }

    private async initialize() {
        const wsUrl = 'wss://localhost:3010'
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
            console.log('websocket connessione aperta')
            this.sendMessage({ type: 'new-user' })
        }

        this.ws.onmessage = async (event) => {
            const message = JSON.parse(event.data)
            console.log('messaggio ricevuto da signaling ', message)

            switch (message.type) {
                case 'join-call':
                    await this.handleIncomingCall(message.sender)
                    break;
                case 'new-participant':
                    await this.handleIncomingCall(message.sender)
                    console.log(` esco da handleIncomingCall per  ${message.sender}`);

                    message.participants.forEach(async (partecipant: string) => {
                        console.log(` Creando connessione con nuovo utente: ${partecipant}`);
                        if (partecipant !== this.username && !this.partecipants.has(partecipant)) {
                            console.log(` partecipant create connection: ${partecipant}`);

                            await this.createPeerConnection(partecipant)
                        }
                    });
                    break;
                case 'session-ended':
                    this.handleSessionEnded(message)
                    break;
                case 'offer':
                    await this.handleOffer(message.sender, message.payload)
                    break;
                case 'answer':
                    await this.handleAnswer(message.sender, message.payload)
                    break;
                case 'ice-candidate':
                    await this.handleIceCandidate(message.sender, message.payload)
                    break;
                default:
                    break;
            }

        }
    }

    private async handleOffer(username: string, offer: RTCSessionDescriptionInit) {
        await this.startStream()
        const peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })

        peerConnection.ontrack = ({ streams }) => {
            if (streams[0]) {
                const existVideo = document.querySelector(`video[data-username="${username}"]`)
                if (!existVideo) {
                    console.log('streams ricevuto => streams[0]', streams[0])
                    this.addVideoStream(username, this.localStream!)
                }
            }
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => peerConnection.addTrack(track, this.localStream!))
        }
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)

        this.peerConnection.set(username, peerConnection)
        this.sendMessage({ type: "answer", receiver: username, payload: answer })
    }

    private async handleIceCandidate(username: string, candidate: RTCIceCandidate) {
        console.log('recive ice candidate', candidate)
        const peerConnection = this.peerConnection.get(username)
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
        } else {
            console.log('no peer for canidate', username)
        }
    }

    private async handleAnswer(username: string, answer: RTCSessionDescriptionInit) {
        console.log('handle answer', answer)
        const peerConnection = this.peerConnection.get(username)
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        }
    }

    private async handleIncomingCall(sender: string) {
        await this.startStream()

        if (!this.partecipants.has(sender)) {
            this.partecipants.set(sender, { connected: false })
            console.log('partecipante aggiunto ', sender)
        }
        this.partecipants.forEach((value, key) => {
            if (key !== sender && !value.connected) {
                console.log('createPeerConnection per  ', sender)

                this.createPeerConnection(key)
            }
        })

        await this.createPeerConnection(sender)
    }

    private async createPeerConnection(username: string) {
        if (this.peerConnection.has(username)) {
            console.log('peerConnection per  ', username, 'esiste gia')
            return
        }

        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        })
        console.log('creato createPeerConnection per  ', username)

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => peerConnection.addTrack(track, this.localStream!))
        }

        peerConnection.ontrack = ({ streams }) => {
            if (streams[0]) {
                console.log('streams ricevuto =)> streams[0]', streams[0])
                this.addVideoStream(username, this.localStream!) // se non in locale stream[0]
            }
        }

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('invio candidate per ', username, 'candidate ', event.candidate)
                this.sendMessage({ type: "ice-candidate", receiver: username, payload: event.candidate })
            }
        }

        this.peerConnection.set(username, peerConnection)
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)
        this.sendMessage({ type: "offer", receiver: username, payload: offer })
    }

    private async handleSessionEnded(message: any) {
        const user = message.user
        if (user) {
            this.partecipants.delete(user)
            const videoContainer = document.getElementById(`video-${user}`)
            if (videoContainer && videoContainer.parentNode) {
                videoContainer.parentNode.removeChild(videoContainer)
            }
        }
    }

    public sendMessage(message: any) {
        console.log('stope rinviare questo message', message)
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ username: this.username, ...message }))
        }
    }

    public async startCall(targetUsername: string) {
        await this.startStream()
        this.sendMessage({ type: 'join-call', sender: this.username, receiver: targetUsername })
    }

    private async startStream() {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        console.log('localStream', this.localStream)
        this.addVideoStream(this.username, this.localStream)

    }

    private async addVideoStream(username: string, stream: MediaStream) {
        if (document.querySelector(`#video-${username}`)) return

        console.log('addVideoStream', username, stream)
        const container = document.createElement('div')
        container.id = `video-${username}`

        const video = document.createElement('video')
        video.autoplay = true
        video.playsInline = true
        video.muted = true
        video.srcObject = stream
        console.log('aggiungo video')
        const usernameLabel = document.createElement('div')
        usernameLabel.textContent = username === this.username ? 'tu' : username

        container.appendChild(video)
        container.appendChild(usernameLabel)
        this.videoGrid.appendChild(container)
    }


    public cleanup() {
        this.peerConnection.forEach((pc) => pc.close())
        this.peerConnection.clear()
        this.localStream?.getTracks().forEach((track) => track.stop())
        this.localStream = null
        this.ws?.close
    }

}


let webRTCClient: webRtcClient | null = null

async function handleLogin() {
    const username = document.getElementById('username') as HTMLInputElement
    const password = document.getElementById('password') as HTMLInputElement
    console.log('username:', username.value, 'password:', password.value)
    try {
        const response = await fetch("https://localhost:3010/api/login", {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: username.value, password: password.value }),
            credentials: 'include'
        })
        const res = await response.json()
        if (response.ok) {
            console.log('login effettuato con successo', res)
            document.getElementById('loginForm')!.style.display = 'none'
            document.getElementById('callInterface')!.style.display = 'block'

            document.getElementById('user')!.innerHTML = `UTENTE: ${res.user.username}`
            webRTCClient = new webRtcClient(res.user.username)
        }

    } catch (error) {
        console.error('error handle login', error)
    }
}

function startCall() {
    const peerUsername = document.getElementById('peerUsername') as HTMLInputElement
    console.log('peerUsername', peerUsername.value)
    if (webRTCClient && peerUsername) {
        webRTCClient.startCall(peerUsername.value)
    }
}


async function logout() {
    webRTCClient?.sendMessage({ type: 'leave-call' })
    webRTCClient?.cleanup()
    await fetch('https://localhost:3010/api/logout', { method: "POST", credentials: 'include' })
    document.getElementById('loginForm')!.style.display = 'block'
    document.getElementById('callInterface')!.style.display = 'none'

}


