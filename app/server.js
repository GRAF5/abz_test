"use strict";

const express = require('express');
const conf = require('./config.json');
const DB = require('../models/index');
const AuthenticationController = require('./controllers/authentication.controller');
const ContentController = require('./controllers/content.controller');
const { handler } = require('./classes/errors');
const path = require("path");

class Server {

  constructor() {
    this.config = JSON.parse(process.env.CONFIG) || conf;
    this.controllers = {};
  }
  
  start() {
    this.server = express();
    this.initControllers();
    this.initRoutes();
    const host = process.env.HOST || '127.0.0.1';
    this.server.listen(process.env.PORT || 3000, host, () => {
      console.log(`Server listening on port ${host}:${process.env.PORT || 3000}`);
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
    this.server.set("view engine", "ejs");
    this.server.set("views", path.join(__dirname, "views"));
    this.server.get("/", (req, res) => {res.render("index", {})});
    this.server.get("/users-list", (req, res) => {res.render("users-list", {})});
    this.server.get("/register", (req, res) => {res.render("register", {})});
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