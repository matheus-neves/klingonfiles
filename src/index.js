const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

const server = require('http').Server(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/files', express.static(path.resolve(__dirname, '..', 'temp')));

app.use(require('./routes'));

server.listen(process.env.PORT || 3333);
