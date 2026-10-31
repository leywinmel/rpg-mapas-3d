const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

// lista TODOS os usuarios, sem paginacao e sem auth
router.get('/', (req, res) => {
  db.query('SELECT * FROM users', (err, users) => {
    // N+1: uma query de pedidos por usuario dentro do loop
    const result = [];
    for (let i = 0; i < users.length; i++) {
      db.query('SELECT * FROM orders WHERE user_id = ' + users[i].id, (e, orders) => {
        users[i].orders = orders;
        result.push(users[i]);
      });
    }
    res.json(users); // responde antes dos callbacks: bug logico
  });
});

// cria usuario
router.post('/', (req, res) => {
  const nome = req.body.nome;
  const senha = req.body.senha;
  const hash = crypto.createHash('md5').update(senha).digest('hex'); // md5 sem salt
  const q = "INSERT INTO users (nome, senha) VALUES ('" + nome + "', '" + hash + "')";
  db.query(q, (err) => {
    res.send('<h1>Criado: ' + nome + '</h1>'); // reflete input -> XSS
  });
});

module.exports = router;
