import express from 'express';
import mysql from 'mysql2';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { TwitterApi } from 'twitter-api-v2'; // Librería para tuitear
import { createServer } from 'http';
import { Server } from 'socket.io';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Configuración de rutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- SERVIR ARCHIVOS ESTÁTICOS ---
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'Proyecto-Graficas-Web-main')));
app.use('/Proyecto-Graficas-Web-main', express.static(path.join(__dirname, 'Proyecto-Graficas-Web-main')));

// --- RUTAS HTML ---
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'Proyecto-Graficas-Web-main', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) res.sendFile(path.join(__dirname, 'index.html'));
    });
});

app.get('/Nivel1.html', (req, res) => res.sendFile(path.join(__dirname, 'Proyecto-Graficas-Web-main', 'Nivel1.html')));
app.get('/Nivel2.html', (req, res) => res.sendFile(path.join(__dirname, 'Proyecto-Graficas-Web-main', 'Nivel2.html')));
app.get('/Nivel3.html', (req, res) => res.sendFile(path.join(__dirname, 'Proyecto-Graficas-Web-main', 'Nivel3.html')));

// --- SOCKET.IO ---
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// --- CLIENTES API ---
const GOOGLE_CLIENT_ID = '770684243514-ihds2q7b9ahb5oecjl1rhglbcmimipd4.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Configuración del BOT de Twitter (@AbranChill3D)
const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// --- BASE DE DATOS ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345', // Recuerda que es mejor usar process.env.DB_PASSWORD
    database: 'gamedb'
});

db.connect(err => {
    if (err) console.error('Error conectando a MySQL:', err);
    else console.log('Conectado a MySQL');
});

// ==========================================================
// 🎮 LÓGICA MULTIJUGADOR (SOCKET.IO)
// ==========================================================
let players = {};

io.on('connection', (socket) => {
    console.log('Jugador conectado al Socket:', socket.id);
    const playerName = socket.handshake.query.username || "Jugador";

    players[socket.id] = {
        x: 0, y: 10, z: 0,
        rotation: { _x: 0, _y: 0, _z: 0, _w: 1 },
        anim: 'idle',
        username: playerName
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', {
        playerId: socket.id,
        playerInfo: players[socket.id]
    });

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].z = movementData.z;
            players[socket.id].rotation = movementData.rotation;
            players[socket.id].anim = movementData.anim;

            socket.broadcast.emit('playerMoved', {
                playerId: socket.id,
                x: players[socket.id].x,
                y: players[socket.id].y,
                z: players[socket.id].z,
                rotation: players[socket.id].rotation,
                anim: players[socket.id].anim
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

// ==========================================================
// 🐦 PUBLICACIONES Y TWITTER (EL BOT)
// ==========================================================

app.post('/posts', (req, res) => {
    const { username, content } = req.body;

    if (!username || !content) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    // 1. Primero guardamos en MySQL
    db.query('INSERT INTO posts (username, content) VALUES (?, ?)', [username, content], async (err, result) => {
        if (err) return res.status(500).json({ error: err });

        // 2. Intentamos publicar en Twitter
        try {
            // Mensaje formateado para la cuenta oficial
            const tweetText = `🎮 Nuevo récord:\n\n👤 Jugador: ${username}\n🏆 Logro: ${content}\n\n#EchoRunner @AbranChill3D`;
            
            const tweet = await twitterClient.v2.tweet(tweetText);
            console.log('Tweet publicado en @AbranChill3D:', tweet);

            res.json({
                success: true,
                id: result.insertId,
                twitter: tweet,
                message: "Publicado exitosamente"
            });
        } catch (error) {
            console.error('Error publicando en Twitter:', error);
            // Respondemos éxito parcial (se guardó en DB pero falló Twitter)
            res.json({
                success: true, // Sigue siendo true para que el juego no marque error grave
                id: result.insertId,
                twitterError: error.message 
            });
        }
    });
});

app.get('/posts', (req, res) => {
    db.query('SELECT * FROM posts ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

// ==========================================================
// 🔐 AUTH & SCORE
// ==========================================================

app.post('/auth/google', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const googleId = payload['sub'];
        const email = payload['email'];
        const name = payload['name'];
        const picture = payload['picture'];

        db.query('SELECT * FROM users WHERE google_id = ?', [googleId], (err, results) => {
            if (err) return res.status(500).json({ error: err });
            if (results.length > 0) {
                res.json({ success: true, user: results[0], message: "Bienvenido" });
            } else {
                db.query('INSERT INTO users (google_id, email, username, picture) VALUES (?, ?, ?, ?)',
                    [googleId, email, name, picture], (err, result) => {
                        if (err) return res.status(500).json({ error: err });
                        res.json({ success: true, user: { id: result.insertId, username: name, picture }, message: "Registrado" });
                    });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(401).json({ error: 'Token inválido' });
    }
});

app.post('/score', (req, res) => {
    const { userId, score, level } = req.body;
    const levelName = level || 'Nivel Desconocido';
    if (!userId) return res.status(400).json({ error: 'Usuario no identificado' });

    db.query('INSERT INTO scores (user_id, score, level_name) VALUES (?, ?, ?)',
        [userId, score, levelName], (err) => {
            if (err) return res.status(500).json({ error: err });
            res.json({ success: true, message: "Puntaje guardado" });
        });
});

// ==========================================================
// 🚀 INICIAR SERVIDOR
// ==========================================================
const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});