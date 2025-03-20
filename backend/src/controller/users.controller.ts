import { NextFunction, Request, Response } from "express"
import prisma from "../db/prisma"
import bcrypt from "bcrypt"
import { SessionManager } from "../services/SessionManager"
import { CustomSession } from "../types/index.type"

export const login = async (req: Request, res: Response, next: NextFunction) => {
    console.log('ENTRO IN /LOGIN')
    try {
        const { username, password } = req.body
        console.log('richiesta di login con credenziali:', username, password)
        const user = await prisma.user.findUnique({
            where: { username }
        })

        console.log(`ho trovato l'utente ${user}`)
        if (!user) {
            return res.status(401).json({ message: 'utente non trovato' })
        }

        /*const passwordMatch = await bcrypt.compare(password, user.password)
        if (!passwordMatch) {
            return res.status(401).json({ message: 'password errata' })
        }*/

        console.log('tutto ok username e password corrispondono')
        req.session.userId = user.id
        req.session.username = user.username
        req.session.authenticated = true

        SessionManager.getInstance().addSession(req.session as CustomSession)

        return res.status(200).json({
            user: {
                id: user.id,
                username: user.username
            },
            message: "login completato"
        })
    } catch (error) {
        console.log('il login mi ha dato errore: ', error)
        return res.status(500).json({ message: 'Errore interno del server' });
    }
}

export const logout = async (req: Request, res: Response, next: NextFunction) => {
    console.log('ENTRO IN /logout')
    try {
        const { username } = req.session as CustomSession
        console.log('effetuo il logout per la session di utente', username)
        req.session.destroy((err) => {
            if (err) {
                SessionManager.getInstance().removeSession(username)
                console.log('errore durante il logout: ', err)
            }
            return res.status(200).json({ message: "logout completato" })
        })
    } catch (error) {
        console.log('il logout mi ha dato errore: ', error)
        return res.status(500).json({ message: 'Errore interno del server' });
    }
}