import express from 'express';
import mysql from 'mysql2';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { TwitterApi } from 'twitter-api-v2';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- SERVIR ARCHIVOS ---
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

// --- SOCKETS ---
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// --- CLIENTES EXTERNOS ---
const GOOGLE_CLIENT_ID = '770684243514-ihds2q7b9ahb5oecjl1rhglbcmimipd4.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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
    password: '12345', // Recuerda usar .env
    database: 'gamedb'
});
db.connect(err => console.log(err ? 'Error DB' : 'Conectado a MySQL'));


// ==========================================================
// 🏆 1. API PUNTUACIONES (SCORE)
// ==========================================================

// A) Guardar Puntuación
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

// B) Consultar Top 10 por Nivel (¡AQUÍ ESTÁ LO QUE FALTABA!)
app.get('/top-scores', async (req, res) => {
    const getTop10 = (levelName) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT u.username, s.score 
                FROM scores s
                JOIN users u ON s.user_id = u.id
                WHERE s.level_name = ?
                ORDER BY s.score DESC
                LIMIT 10
            `;
            db.query(sql, [levelName], (err, results) => {
                if (err) reject(err); else resolve(results);
            });
        });
    };

    try {
        const [nivel1, nivel2, nivel3] = await Promise.all([
            getTop10('Nivel 1'),
            getTop10('Nivel 2'),
            getTop10('Nivel 3')
        ]);
        res.json({ nivel1, nivel2, nivel3 });
    } catch (error) {
        console.error("Error reading scores:", error);
        res.status(500).json({ error: "Error DB" });
    }
});

// ==========================================================
// 🐦 2. API TWITTER (POSTS)
// ==========================================================

app.post('/posts', (req, res) => {
    const { username, content } = req.body;
    if (!username || !content) return res.status(400).json({ error: 'Faltan datos' });

    db.query('INSERT INTO posts (username, content) VALUES (?, ?)', [username, content], async (err, result) => {
        if (err) return res.status(500).json({ error: err });

        try {
            const tweetText = `🎮 Récord de ${username}: ${content} #EchoRunner @AbranChill3D`;
            const tweet = await twitterClient.v2.tweet(tweetText);
            console.log('Tweet enviado:', tweet);
            res.json({ success: true, id: result.insertId, twitter: tweet });
        } catch (error) {
            console.error('Error Twitter:', error);
            res.json({ success: true, id: result.insertId, twitterError: error.message });
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
// 🔐 3. API GOOGLE (AUTH)
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
                res.json({ success: true, user: results[0] });
            } else {
                db.query('INSERT INTO users (google_id, email, username, picture) VALUES (?, ?, ?, ?)',
                    [googleId, email, name, picture], (err, result) => {
                        if (err) return res.status(500).json({ error: err });
                        res.json({ success: true, user: { id: result.insertId, username: name, picture } });
                    });
            }
        });
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});

// ==========================================================
// ⚡ 4. SOCKET.IO
// ==========================================================
let players = {};

io.on('connection', (socket) => {
    console.log('Jugador conectado:', socket.id);
    const playerName = socket.handshake.query.username || "Jugador";

    players[socket.id] = {
        x: 0, y: 10, z: 0,
        rotation: { _x: 0, _y: 0, _z: 0, _w: 1 },
        anim: 'idle',
        username: playerName
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', { playerId: socket.id, playerInfo: players[socket.id] });

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
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

// ==========================================================
// 🚀 INICIAR
const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});