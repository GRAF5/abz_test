'use strict';

const should = require('should');
const sinon = require('sinon');
const { handler, BadRequestError, UnauthorizedError, NotFound, UnprocessableEntity } = require('./errors');


describe("Errors", () => {

  let sandbox = sinon.createSandbox();
  let res = {
    status: () => res,
    json: () => res
  };

  beforeEach(() => {
    res.status = sandbox.spy(res.status);
    res.json = sandbox.spy(res.json);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should handle base error", () => {
    const err = new Error("Base error");
    handler(err, {}, res, () => {});
    should(res.status.calledOnce).be.true();
    should(res.json.calledOnce).be.true();
    should(res.status.getCall(0).args).be.eql([500]);
    should(res.json.getCall(0).args).be.eql([{
      success: false,
      message: err.message
    }]);
  });

  it("should handle BadRequestError", () => {
    const err = new BadRequestError("BadRequestError");
    handler(err, {}, res, () => {});
    should(res.status.calledOnce).be.true();
    should(res.json.calledOnce).be.true();
    should(res.status.getCall(0).args).be.eql([400]);
    should(res.json.getCall(0).args).be.eql([{
      success: false,
      message: err.message
    }]);
  });

  it("should handle UnauthorizedError", () => {
    const err = new UnauthorizedError("UnauthorizedError");
    handler(err, {}, res, () => {});
    should(res.status.calledOnce).be.true();
    should(res.json.calledOnce).be.true();
    should(res.status.getCall(0).args).be.eql([401]);
    should(res.json.getCall(0).args).be.eql([{
      success: false,
      message: err.message
    }]);
  });

  it("should handle NotFound", () => {
    const err = new NotFound("NotFound");
    handler(err, {}, res, () => {});
    should(res.status.calledOnce).be.true();
    should(res.json.calledOnce).be.true();
    should(res.status.getCall(0).args).be.eql([404]);
    should(res.json.getCall(0).args).be.eql([{
      success: false,
      message: err.message
    }]);
  });

  it("should handle NotFound with fails", () => {
    const err = new NotFound("NotFound", [{id: "Need id"}]);
    handler(err, {}, res, () => {});
    should(res.status.calledOnce).be.true();
    should(res.json.calledOnce).be.true();
    should(res.status.getCall(0).args).be.eql([404]);
    should(res.json.getCall(0).args).be.eql([{
      success: false,
      message: err.message,
      fails: {
        id: ["Need id"]
      }
    }]);
  });

  it("should handle UnprocessableEntity", () => {
    const err = new UnprocessableEntity("UnprocessableEntity");
    handler(err, {}, res, () => {});
    should(res.status.calledOnce).be.true();
    should(res.json.calledOnce).be.true();
    should(res.status.getCall(0).args).be.eql([422]);
    should(res.json.getCall(0).args).be.eql([{
      success: false,
      message: err.message
    }]);
  });

  it("should handle UnprocessableEntity with fails", () => {
    const err = new UnprocessableEntity("NotFound", [{id: "Need id"}]);
    handler(err, {}, res, () => {});
    should(res.status.calledOnce).be.true();
    should(res.json.calledOnce).be.true();
    should(res.status.getCall(0).args).be.eql([422]);
    should(res.json.getCall(0).args).be.eql([{
      success: false,
      message: err.message,
      fails: {
        id: ["Need id"]
      }
    }]);
  });
});