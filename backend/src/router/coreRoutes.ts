import express, { Express } from "express"
import { login, logout } from "../controller/users.controller"

export const coreRouter = (app: Express): void => {

    const usersRouter = express.Router()
    console.log("chiamo login")
    usersRouter.post('/login', function(req, res, next) {
        login(req, res, next);
    });
    usersRouter.post('/logout', function(req, res, next) {
        logout(req, res, next);
    });

    //usersRouter.post('/login', (req, res, next) => login(req, res, next))
    //usersRouter.post('/logout', (req, res, next) => logout(req, res, next))


    app.use('/api', usersRouter)
} 