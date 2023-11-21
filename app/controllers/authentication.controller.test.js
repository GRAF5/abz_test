'use strict';

const should = require('should');
const sinon = require('sinon');
const jwt = require("jsonwebtoken");
const AuthenticationController = require('./authentication.controller');
const { BadRequestError, UnauthorizedError } = require('../classes/errors');


describe("AuthenticationController", () => {

  let config = {
    jwt: {
      secret: "secret",
      tokenExpiresIn: "5m" 
    }
  };
  let controller;
  let sandbox = sinon.createSandbox();
  let res = {
    status: () => res,
    json: () => res
  };

  beforeEach(() => {
    controller = new AuthenticationController(config);
    res.status = sandbox.spy(res.status);
    res.json = sandbox.spy(res.json);
  });

  afterEach(() => {
    controller.stop();
    sandbox.restore();
  });

  it("should register GET /token path", () => {
    const router = controller.router();
    should(router.stack.find(layer => 
      layer.route && 
      layer.route.path === "/token" && 
      layer.route.methods["get"])).not.undefined();
  });

  it("should generate token", async () => {
    await controller.generateToken({}, res, () => {});
    should(res.json.getCall(0).args[0].success).be.eql(true);
    should(res.json.getCall(0).args[0].token).be.String();
  });

  it("should requires token on check", async () => {
    const next = sandbox.spy();
    const req = {
      headers: {}
    }
    await controller.checkToken(req, {}, next);
    should(next.getCall(0).args[0]).be.eql(new BadRequestError("The token is required."))
  });

  it("should verify token", async () => {
    const next = sandbox.spy();
    const req = {
      headers: {
        token: "token"
      }
    }
    await controller.checkToken(req, {}, next);
    should(next.getCall(0).args[0]).be.eql(new UnauthorizedError("The token expired."))
  });

  it("should verify is already used token", async () => {
    
    const next = sandbox.spy();
    const req = {
      headers: {
        token: jwt.sign({}, config.jwt.secret, {expiresIn: config.jwt.tokenExpiresIn})
      }
    }
    controller.usedTokens.add(req.headers.token);
    await controller.checkToken(req, {}, next);
    should(next.getCall(0).args[0]).be.eql(new UnauthorizedError("The token expired."))
  });

  it("should call next for valid token", async () => {    
    const next = sandbox.spy();
    const req = {
      headers: {
        token: jwt.sign({}, config.jwt.secret, {expiresIn: config.jwt.tokenExpiresIn})
      }
    }
    await controller.checkToken(req, {}, next);
    should(next.getCall(0).args).be.eql([]);
  });

  it("should remoce expired tokens from used", () => {
    controller.usedTokens.add(jwt.sign({}, config.jwt.secret, {expiresIn: "-1m"}));
    controller._freeUsedTokensJob();
    should(controller.usedTokens.size).be.eql(0);
  });
});