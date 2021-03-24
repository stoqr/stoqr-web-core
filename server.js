const http = require('http');
const app = require('./app'); //initiliaze the application over app.js
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
server.listen(PORT, '0.0.0.0', () =>
  console.log('Server is running on PORT:' + PORT)
);
