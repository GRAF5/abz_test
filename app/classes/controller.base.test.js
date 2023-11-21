'use strict';

const should = require('should');
const sinon = require('sinon');
const Controller = require('./controller.base');

describe("ControllerBase", () => {

  let controller = new Controller();
  let sandbox = sinon.createSandbox();
  let res = {
    status: () => res,
    json: () => res
  };

  beforeEach(() => {
    controller = new Controller();
    res.status = sandbox.spy(res.status);
    res.json = sandbox.spy(res.json);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should compose response", () => {
    controller.response(res);
    should(res.status.calledOnce).be.true();
    should(res.json.calledOnce).be.true();
    should(res.status.getCall(0).args).be.eql([200]);
    should(res.json.getCall(0).args).be.eql([{
      success: true,
      message: undefined
    }]);
  });

  it("should compose response with message", () => {
    controller.response(res, {}, "Message");
    should(res.status.calledOnce).be.true();
    should(res.json.calledOnce).be.true();
    should(res.status.getCall(0).args).be.eql([200]);
    should(res.json.getCall(0).args).be.eql([{
      success: true,
      message: "Message"
    }]);
  });

  it("should compose response with data", () => {
    controller.response(res, {users: [{name: "test"}]});
    should(res.status.calledOnce).be.true();
    should(res.json.calledOnce).be.true();
    should(res.status.getCall(0).args).be.eql([200]);
    should(res.json.getCall(0).args).be.eql([{
      success: true,
      users: [{name: "test"}],
      message: undefined
    }]);
  });

  it("should compose response with another status", () => {
    controller.response(res, {}, undefined, 204);
    should(res.status.calledOnce).be.true();
    should(res.json.calledOnce).be.true();
    should(res.status.getCall(0).args).be.eql([204]);
    should(res.json.getCall(0).args).be.eql([{
      success: true,
      message: undefined
    }]);
  });
});