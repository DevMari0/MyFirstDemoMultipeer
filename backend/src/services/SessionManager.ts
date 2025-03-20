import { CustomSession } from "../types/index.type";

export class SessionManager {

    private static instance: SessionManager;
    private session: Map<string, CustomSession>

    private constructor() {
        console.log('richiesta di istanza session manager')
        this.session = new Map()
    }

    public static getInstance(): SessionManager {
        if (!SessionManager.instance) {
            console.log("instamce non valorizzato creo l'istanza")
            SessionManager.instance = new SessionManager()
        }
        return SessionManager.instance
    }

    public addSession(session: CustomSession): void {
        console.log('sto per mappare la session a', session)
        console.log('session mappate precedentemente', {
            numero_sessioni: this.session.size,
            sessioni_attive: Array.from(this.session.keys())
        })

        this.session.set(session.userId, session)
        //console.log('session mappata', this.session)
        console.log('session mappate succesivamente', {
            numero_sessioni: this.session.size,
            sessioni_attive: Array.from(this.session.keys())
        })

    }

    public removeSession(sessionId: string): void {
        const session = this.session.get(sessionId)
        if (session) {
            this.session.delete(sessionId)
        }
    }

}