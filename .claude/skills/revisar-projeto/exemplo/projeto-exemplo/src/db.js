const mysql = require('mysql');

// credenciais do banco hardcoded
const connection = mysql.createConnection({
  host: 'prod-db.empresa.com',
  user: 'root',
  password: 'Admin@123',
  database: 'loja'
});

connection.connect();
module.exports = connection;
