"use strict";

const express = require('express');
const conf = require('./config.json');
const DB = require('../models/index');
const AuthenticationController = require('./controllers/authentication.controller');
const ContentController = require('./controllers/content.controller');
const { handler } = require('./classes/errors');

class Server {

  constructor() {
    this.config = process.env.CONFIG || conf;
    this.controllers = {};
  }
  
  start() {
    this.server = express();
    this.initControllers();
    this.initRoutes();
    this.server.listen(3000, () => {
      console.log('Server listening on port 3000');
    });
    this.registerShutdown();
  }

  async stop() {
    for (let controller of Object.values(this.controllers)) {
      if (controller.stop) {
        await controller.stop();
      }
    }
  }

  initControllers() {
    const authentication = new AuthenticationController(this.config);
    const content = new ContentController(this.config, authentication, DB.Position, DB.User);

    this.controllers.authentication = authentication;
    this.controllers.content = content;
  }

  initRoutes() {
    this.server.use(express.json());

    for (let controller of Object.values(this.controllers)) {
      this.server.use('/', controller.router());
    }
    this.server.use(handler);
  }

  registerShutdown() {
    let shutdown = () => this.stop()
      .then(() => process.exit(), () => process.exit());
      
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}

module.exports = Server;