'use strict';

const should = require('should');
const sinon = require('sinon');
const jwt = require("jsonwebtoken");
const ContentController = require('./content.controller');
const DB = require('../../models/index');
const tinify = require("tinify");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { NotFound, UnprocessableEntity, ConflictError } = require('../classes/errors');

describe("ContentController", () => {

  let config = {
    s3: {
      endpoint: "endpoint",
      region: "region",
      accessKeyId: "accessKeyId",
      secretAccessKey: "secretAccessKey",
      bucket: "bucket"
    },
    photoMaxSizeInMb: 1
  };
  let controller;
  let sandbox = sinon.createSandbox();
  let res = {
    status: () => res,
    json: () => res
  };

  before(async () => {
    DB.sequelize.options.logging = false;
    await DB.sequelize.sync({ force: true });
  });
  
  beforeEach(() => {
    controller = new ContentController(config, {checkToken: () => {}}, DB.Position, DB.User);
    res.status = sandbox.spy(res.status);
    res.json = sandbox.spy(res.json);
  });

  afterEach(async () => {
    sandbox.restore();
    await DB.Position.destroy({ where: {} });
    await DB.User.destroy({ where: {} });
  });

  after(async () => {
    await DB.sequelize.close();
  });
  
  it("should register GET /positions path", () => {
    const router = controller.router();
    should(router.stack.find(layer => 
      layer.route && 
      layer.route.path === "/positions" && 
      layer.route.methods["get"])).not.undefined();
  });
  
  it("should register GET /users path", () => {
    const router = controller.router();
    should(router.stack.find(layer => 
      layer.route && 
      layer.route.path === "/users" && 
      layer.route.methods["get"])).not.undefined();
  });
  
  it("should register POST /users path", () => {
    const router = controller.router();
    should(router.stack.find(layer => 
      layer.route && 
      layer.route.path === "/users" && 
      layer.route.methods["post"])).not.undefined();
  });

  it("should register GET /users/:id path", () => {
    const router = controller.router();
    should(router.stack.find(layer => 
      layer.route && 
      layer.route.path === "/users/:id" && 
      layer.route.methods["get"])).not.undefined();
  });

  it("should get all positions", async () => {
    await DB.Position.create({name: "test"});
    await controller.getPositions({}, res, () => {});
    should(res.json.getCall(0).args[0].success).be.eql(true);
    should(res.json.getCall(0).args[0].positions.length).be.eql(1);
    should(res.json.getCall(0).args[0].positions[0].dataValues).be.eql({
      id: 1, name: "test"
    });
  });

  it("should return not found for empty positions", async () => {
    const next = sandbox.spy();
    await controller.getPositions({}, res, next);
    should(next.getCall(0).args[0]).be.eql(new NotFound("Page not found"))
  });

  describe("Get user", () => {
    it("should get user by id", async () => {
      let position = await DB.Position.create({name: "test"});
      let user = await DB.User.create({
        name: "user",
        email: "email",
        phone: "phone",
        position_id: position.id,
        photo: "photo",
        registration_timestamp: 1
      });
      await controller.getUser({params: {id: user.id}}, res, () => {});
      should(res.json.getCall(0).args[0].success).be.eql(true);
      should(res.json.getCall(0).args[0].user).be.eql({
        id: user.id, 
        name: "user",
        email: "email",
        phone: "phone",
        position: "test",
        position_id: position.id,
        photo: "photo",
        registration_timestamp: "1"
      });
    });
  
    it("should return UnprocessableEntity for not integer id when get user", async () => {
      const next = sandbox.spy();
      await controller.getUser({params: {id: "id"}}, res, next);
      should(next.getCall(0).args[0]).be.eql(new UnprocessableEntity("Validation failed",
        [{user_id: "The user_id must be an integer."}]))
    });
  
    it("should return NotFound for not exist id when get user", async () => {
      const next = sandbox.spy();
      await controller.getUser({params: {id: 0}}, res, next);
      should(next.getCall(0).args[0]).be.eql(new NotFound("The user with the requested identifier does not exist",
        [{user_id: "User not found."}]))
    });
  });

  describe("Get users", () => {
    it("should return UnprocessableEntity for not integer count", async () => {
      const next = sandbox.spy();
      await controller.getUsers({query: {count: "l", offset: 0}}, res, next);
      should(next.getCall(0).args[0]).be.eql(new UnprocessableEntity("Validation failed",
        [{count: "The count must be an integer."}]))
    });
    
    it("should return UnprocessableEntity for page below 1", async () => {
      const next = sandbox.spy();
      await controller.getUsers({query: {count: 1, page: 0}}, res, next);
      should(next.getCall(0).args[0]).be.eql(new UnprocessableEntity("Validation failed",
        [{page: "The page must be at least 1."}]))
    });

    it("should get users with offset", async () => {
      const next = sandbox.spy();
      let position = await DB.Position.create({name: "test"});
      let user = await DB.User.create({
        name: "user",
        email: "email",
        phone: "phone",
        position_id: position.id,
        photo: "photo",
        registration_timestamp: 1
      });
      let user2 = await DB.User.create({
        name: "user",
        email: "email1",
        phone: "phone1",
        position_id: position.id,
        photo: "photo",
        registration_timestamp: 2
      });
      await controller.getUsers({query: {count: 2, offset: 0}}, res, next);
      should(res.json.getCall(0).args[0]).be.eql({
        message: undefined,
        success: true,
        total_users: 2,
        count: 2,
        users: [
          {
            id: user.id,
            name: "user",
            email: "email",
            phone: "phone",
            position_id: position.id,
            position: "test",
            photo: "photo",
            registration_timestamp: "1"
          },
          {
            id: user2.id,
            name: "user",
            email: "email1",
            phone: "phone1",
            position_id: position.id,
            position: "test",
            photo: "photo",
            registration_timestamp: "2"
          }
        ]
      });
    });

    it("should get users with offset without page", async () => {
      const next = sandbox.spy();
      let position = await DB.Position.create({name: "test"});
      let user = await DB.User.create({
        name: "user",
        email: "email",
        phone: "phone",
        position_id: position.id,
        photo: "photo",
        registration_timestamp: 1
      });
      let user2 = await DB.User.create({
        name: "user",
        email: "email1",
        phone: "phone1",
        position_id: position.id,
        photo: "photo",
        registration_timestamp: 2
      });
      await controller.getUsers({query: {count: 2, offset: 0, page: 1}}, res, next);
      should(res.json.getCall(0).args[0]).be.eql({
        message: undefined,
        success: true,
        total_users: 2,
        count: 2,
        users: [
          {
            id: user.id,
            name: "user",
            email: "email",
            phone: "phone",
            position_id: position.id,
            position: "test",
            photo: "photo",
            registration_timestamp: "1"
          },
          {
            id: user2.id,
            name: "user",
            email: "email1",
            phone: "phone1",
            position_id: position.id,
            position: "test",
            photo: "photo",
            registration_timestamp: "2"
          }
        ]
      });
    });

    it("should get users with page", async () => {
      const next = sandbox.spy();
      let position = await DB.Position.create({name: "test"});
      let user = await DB.User.create({
        name: "user",
        email: "email",
        phone: "phone",
        position_id: position.id,
        photo: "photo",
        registration_timestamp: 1
      });
      let user2 = await DB.User.create({
        name: "user",
        email: "email1",
        phone: "phone1",
        position_id: position.id,
        photo: "photo",
        registration_timestamp: 2
      });
      await controller.getUsers({query: {count: 2, page: 1}}, res, next);
      should(res.json.getCall(0).args[0]).be.eql({
        message: undefined,
        success: true,
        page: 1,
        total_pages: 1,
        total_users: 2,
        count: 2,
        links: {
          next_url: null,
          prev_url: null
        },
        users: [
          {
            id: user.id,
            name: "user",
            email: "email",
            phone: "phone",
            position_id: position.id,
            position: "test",
            photo: "photo",
            registration_timestamp: "1"
          },
          {
            id: user2.id,
            name: "user",
            email: "email1",
            phone: "phone1",
            position_id: position.id,
            position: "test",
            photo: "photo",
            registration_timestamp: "2"
          }
        ]
      });
    });

    it("should set prev_url and next_url", async () => {
      const next = sandbox.spy();
      let position = await DB.Position.create({name: "test"});
      await DB.User.create({
        name: "user",
        email: "email",
        phone: "phone",
        position_id: position.id,
        photo: "photo",
        registration_timestamp: 1
      });
      let user2 = await DB.User.create({
        name: "user",
        email: "email1",
        phone: "phone1",
        position_id: position.id,
        photo: "photo",
        registration_timestamp: 2
      });
      await DB.User.create({
        name: "user",
        email: "email1",
        phone: "phone1",
        position_id: position.id,
        photo: "photo",
        registration_timestamp: 2
      });
      await controller.getUsers({query: {count: 1, page: 2}, get: () => {}}, res, next);
      should(res.json.getCall(0).args[0]).be.eql({
        message: undefined,
        success: true,
        page: 2,
        total_pages: 3,
        total_users: 3,
        count: 1,
        links: {
          next_url: `undefined://undefined/users-list?page=3&count=1`,
          prev_url: `undefined://undefined/users-list?page=1&count=1`
        },
        users: [
          {
            id: user2.id,
            name: "user",
            email: "email1",
            phone: "phone1",
            position_id: position.id,
            position: "test",
            photo: "photo",
            registration_timestamp: "2"
          }
        ]
      });
    });

    it("should return not found for page", async () => {
      const next = sandbox.spy();
      await controller.getUsers({query: {count: 1, page: 1}}, res, next);
      should(next.getCall(0).args[0]).be.eql(new NotFound("Page not found"));
    });
  });

  describe("Create user", () => {

    let body;
    let file;
    let tinifyMock;
    let s3Mock;

    beforeEach(() => {
      body = {
        name: 'user',
        email: 'example@test.com',
        phone: '+380496540023',
        position_id: 1
      };
      file = {
        size: 1024,
        mimetype: "image/jpeg",
        buffer: Buffer.from("file")
      };
      tinifyMock = sandbox.stub(tinify, "fromBuffer").returns({
        resize: sandbox.spy(() => {
          return {
            toBuffer: async () => file.buffer
          }
        })
      });
      s3Mock = sandbox.stub(controller.s3, "send");
    });

    it("should validate name min length", async () => {
      const next = sandbox.spy();
      body.name = "u";
      await controller.createUser({body, file}, res, next);
      should(next.getCall(0).args[0]).be.eql(new UnprocessableEntity("Validation failed", [
        {name: "The name must be at least 2 characters."}
      ]));
    });

    it("should validate email", async () => {
      const next = sandbox.spy();
      body.email = "email@.com";
      await controller.createUser({body, file}, res, next);
      should(next.getCall(0).args[0]).be.eql(new UnprocessableEntity("Validation failed", [
        {email: "The email must be a valid email address."}
      ]));
    });

    it("should validate phone", async () => {
      const next = sandbox.spy();
      body.phone = "0951154";
      await controller.createUser({body, file}, res, next);
      should(next.getCall(0).args[0]).be.eql(new UnprocessableEntity("Validation failed", [
        {phone: "The phone field is required."}
      ]));
    });

    it("should validate position_id", async () => {
      const next = sandbox.spy();
      body.position_id = "l";
      await controller.createUser({body, file}, res, next);
      should(next.getCall(0).args[0]).be.eql(new UnprocessableEntity("Validation failed", [
        {position_id: "The position id must be an integer."}
      ]));
    });

    it("should validate position_id min value", async () => {
      const next = sandbox.spy();
      body.position_id = 0;
      await controller.createUser({body, file}, res, next);
      should(next.getCall(0).args[0]).be.eql(new UnprocessableEntity("Validation failed", [
        {position_id: "The position id must be an integer."}
      ]));
    });

    it("should validate photo size", async () => {
      const next = sandbox.spy();
      file.size = config.photoMaxSizeInMb * 1024 * 1024 + 1;
      await controller.createUser({body, file}, res, next);
      should(next.getCall(0).args[0]).be.eql(new UnprocessableEntity("Validation failed", [
        {photo: "The photo may not be greater than 5 Mbytes."}
      ]));
    });

    it("should validate photo mime", async () => {
      const next = sandbox.spy();
      file.mimetype = "png";
      await controller.createUser({body, file}, res, next);
      should(next.getCall(0).args[0]).be.eql(new UnprocessableEntity("Validation failed", [
        {photo: "Image is invalid."}
      ]));
    });

    it("should check email conflict", async () => {
      const next = sandbox.spy();
      let position = await DB.Position.create({name: "test"});
      body.position_id = position.id;
      await DB.User.create({
        ...body,
        phone: "+380123456678"
      });
      await controller.createUser({body, file}, res, next);
      should(next.getCall(0).args[0]).be.eql(new ConflictError("User with this phone or email already exist"));
    });

    it("should check phone conflict", async () => {
      const next = sandbox.spy();
      let position = await DB.Position.create({name: "test"});
      body.position_id = position.id;
      await DB.User.create({
        ...body,
        email: "another@test.com"
      });
      await controller.createUser({body, file}, res, next);
      should(next.getCall(0).args[0]).be.eql(new ConflictError("User with this phone or email already exist"));
    });

    it("should create user", async () => {
      const next = sandbox.spy();
      let position = await DB.Position.create({name: "test"});
      body.position_id = position.id;
      await controller.createUser({body, file}, res, next);
      const user = await DB.User.findOne();
      should(tinifyMock.getCall(0).args[0]).be.eql(file.buffer);
      should(s3Mock.getCall(0).args[0]).be.eql(new PutObjectCommand({
        Body: file.buffer,
        Key: user.id + '.jpg',
        Bucket: config.s3.bucket
      }));
      should(res.json.getCall(0).args[0]).be.eql({
        success: true,
        user_id: user.id,
        message: "New user successfully registered."
      });
    });
  });
});