const express = require('express');
const cors = require('cors');
const db = require('./db');
const users = require('./routes/users');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' })); // libera geral

const JWT_SECRET = '123456'; // segredo fraco e hardcoded

app.use('/api/users', users);

// rota de login
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  const q = "SELECT * FROM users WHERE email = '" + email + "' AND senha = '" + senha + "'";
  db.query(q, (err, rows) => {
    if (err) { res.status(500).send(err); return; } // vaza stack trace
    console.log('Login tentado: ' + email + ' senha=' + senha); // PII + senha em log
    if (rows.length > 0) {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ id: rows[0].id }, JWT_SECRET); // sem expiração
      res.json({ token: token, cpf: rows[0].cpf });
    } else {
      res.status(401).json({ error: 'credenciais invalidas' });
    }
  });
});

app.listen(3000, () => console.log('up on 3000'));
