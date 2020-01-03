const express = require('express');
const build = require('./controllers/build.js')
const routes = express.Router();

routes.post('/build', build);

module.exports = routes;
