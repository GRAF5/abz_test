"use strict";

const { Router } = require("express");
const jwt = require("jsonwebtoken");
const Controller = require("../classes/controller.base");
const { UnauthorizedError, BadRequestError } = require("../classes/errors");

class AuthenticationController extends Controller {

  constructor(config) {
    super();
    this.config = config;
    this.secret = config.jwt.secret;
    this.expiresIn = config.jwt.tokenExpiresIn;
    this.usedTokens = new Set();
    this.jobs = [
      setInterval(this._freeUsedTokensJob.bind(this), 1 * 60 * 1000)
    ];
  }

  router() {
    const router = Router();
    router.route('/token').get(this.generateToken.bind(this));
    return router;
  }

  stop() {
    for(let job of this.jobs) {
      clearInterval(job);
    }
  }

  _freeUsedTokensJob() {
    if (!this.freeUsedTokensJob) {
      this.freeUsedTokensJob = true;

      this.usedTokens.forEach(token => {
        try {
          jwt.verify(token, this.secret);
        } catch {
          this.usedTokens.delete(token);
        }
      });

      this.freeUsedTokensJob = false;
    }
  }

  async generateToken(req, res, next) {
    try {
      const token = jwt.sign({}, this.secret, {expiresIn: this.expiresIn});
      this.response(res, { token });
    } catch (err) {
      next(err);
    }
  }

  async checkToken(req, res, next) {
    try {
      const { token } = req.headers;  
      if (!token) {
        throw new BadRequestError("The token is required.");
      }

      try {
        jwt.verify(token, this.secret);
      } catch {
        throw new UnauthorizedError("The token expired.");
      }

      if (this.usedTokens.has(token)) {
        throw new UnauthorizedError("The token expired.");
      }

      this.usedTokens.add(token);
      next();
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthenticationController;