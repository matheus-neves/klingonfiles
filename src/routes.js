const express = require('express');
const build = require('./controllers/build.js')
const routes = new express.Router();

routes.get('/build', build );

module.exports = routes;
