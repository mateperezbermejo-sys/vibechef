const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'vibechef-dev-secret';

async function register(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'El email ya está registrado.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, password_hash);

    const token = jwt.sign({ userId: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, userId: result.lastInsertRowid, email });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar usuario.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: user.id, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
}

module.exports = { register, login };
