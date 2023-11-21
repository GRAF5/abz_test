const { Router } = require("express");

class Controller {

  constructor() {

  }

  router() {
    return Router();
  }

  response(res, data = {},  message = undefined, status = 200) {
    res.status(status).json({
      success: true,
      message,
      ...data
    });
  }
}

module.exports = Controller;