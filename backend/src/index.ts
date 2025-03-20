import express from 'express'
import cors from 'cors'
import https from 'https'
import fs from "fs"
import expressSession from 'express-session'
import path from 'path'
import { coreRouter } from './router/coreRoutes'
import { WebSocketManager } from './services/webSocketManager'
import dotenv from 'dotenv';
dotenv.config();
const PORT = 3010
const app = express()

app.use(express.json())
app.use(cors({ origin: "*" }))

const server = https.createServer({
    key: fs.readFileSync('../certificati/domain.key'),
    cert: fs.readFileSync('../certificati/domain.crt'),
    passphrase: "pippo"
}, app)

app.use(expressSession({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 8640000,
        sameSite: "strict",
        secure: true
    }
}))

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public/index.html'))
})

app.use('/src', express.static(path.join(__dirname, '../../frontend/src')))

coreRouter(app)
new WebSocketManager(server)
console.log("DATABASE_URL:", process.env.DATABASE_URL);




server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})





