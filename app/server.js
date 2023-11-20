const config = require('./config.json');
const DB = require('../models/index');

class Server {

  constructor() {
    this.config = process.env.CONFIG || config;
  }
  
  start () {
    
  }
}

module.exports = Server;