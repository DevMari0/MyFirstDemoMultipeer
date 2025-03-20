import { Session } from "express-session";

export interface User {
    id: string;
    username: string
    password: string
}




declare module "express-session" {
    interface SessionData {
        userId: string
        username: string
        password: string
        authenticated: boolean
    }

}

export interface CustomSession extends Session {
    userId: string
    username: string
    password: string
    authenticated: boolean
}