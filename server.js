import express from 'express';
import mysql from 'mysql2';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { TwitterApi } from 'twitter-api-v2';

dotenv.config(); // 🔹 cargar variables antes de usar TwitterApi

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Conexión a MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'gamedb'
});

db.connect(err => {
    if (err) throw err;
    console.log('Conectado a MySQL');
});

// Cliente de Twitter (OAuth 1.0a User Context)
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET
});

// ==================== ENDPOINTS ====================

// Crear publicación local + Twitter
app.post('/posts', (req, res) => {
  const { username, content } = req.body;

  if (!username || !content) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  db.query('INSERT INTO posts (username, content) VALUES (?, ?)', [username, content], async (err, result) => {
    if (err) return res.status(500).json({ error: err });

    try {
      // Publicar en Twitter
      const tweet = await twitterClient.v2.tweet(`${username} publicó desde el juego: ${content}`);
      console.log('Tweet publicado:', tweet);

      res.json({
        success: true,
        id: result.insertId,
        twitter: tweet
      });
    } catch (error) {
      console.error('Error publicando en Twitter:', error);
      res.json({
        success: true,
        id: result.insertId,
        twitter: { error: error.message, fullError: error }
      });
    }
  });
});

// Obtener publicaciones locales
app.get('/posts', (req, res) => {
  db.query('SELECT * FROM posts ORDER BY created_at DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// ==================== SERVIDOR ====================
app.listen(3000, () => console.log('API corriendo en http://localhost:3000'));
