"use strict";

const { Router } = require("express");
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' });
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const tinify = require("tinify");
const fs = require("fs");
const Controller = require("../classes/controller.base");
const { NotFound, UnprocessableEntity } = require("../classes/errors");

class ContentController extends Controller {

  constructor(config, authentication, Position, User) {
    super();
    this.config = config;
    this.authentication = authentication;
    this.Position = Position;
    this.User = User;
    tinify.key = config.tinify_key;
    this.s3 = new S3Client({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey 
      }
    });
  }

  router() {
    const router = Router();
    router.route('/positions').get(this.getPositions.bind(this));
    router.route('/users')
      .get(this.getUsers.bind(this))
      .post(
        this.authentication.checkToken.bind(this.authentication),
        upload.single("photo"),
        this.createUser.bind(this));
     router.route('/users/:id').get(this.getUser.bind(this));
    return router;
  }

  async getPositions(req, res, next) {
    try {
      const positions = await this.Position.findAll({attributes: ['id', 'name']});
      this.response(res, { positions });
    } catch (err) {
      next(new NotFound("Page not found"));
    }
  }

  async createUser(req, res, next) {
    try {
      const fails = [];
      const { name, email, phone, position_id } = req.body;
      const photo = req.file;
      if (!name || name.length < 2) {
        fails.push({name: "The name must be at least 2 characters."});
      }
      if (!email || email.length < 2 || email.length > 100 || !/^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/.test(email)) {
        fails.push({email: "The email must be a valid email address."});
      }
      if (!phone || !/^[\+]{0,1}380([0-9]{9})$/.test(phone)) {
        fails.push({phone: "The phone field is required."});
      }
      if (!position_id || Number.isInteger(position_id) || position_id < 1) {
        fails.push({position_id: "The position id must be an integer."});
      }
      if (!photo || photo.size > this.config.photoMaxSizeInMb * 1024 * 1024) {
        fails.push({photo: "The photo may not be greater than 5 Mbytes."});
      }
      if (photo && !photo.mimetype.startsWith("image/jpeg")) {
        fails.push({photo: "Image is invalid."})
      }
      if (fails.length) {
        throw new UnprocessableEntity("Validation failed", fails);
      }
      const user = await this.User.create({
        name, 
        email, 
        phone, 
        position_id,
        registration_timestamp: Date.now()
      });
      const photoUrl = await this._saveImage(photo, user.id + '.jpg')
      await user.update({ photo: photoUrl});
      this.response(res, { user_id: user.id }, "New user successfully registered.");
    } catch(err) {
      next(err);
    }
  }

  async _saveImage(photo, Key) {
    const destination = `${this.config.s3.endpoint}/${this.config.s3.bucket}/${Key}`;
    const Body = await tinify
      .fromFile(photo.path)
      .resize({
        method: "cover",
        width: 70,
        height: 70
      })
      .toBuffer();
    await this.s3.send(new PutObjectCommand({
      Body,
      Key,
      Bucket: this.config.s3.bucket
    }));
    fs.rmSync(photo.path);
    return destination;
  }

  async getUser(req, res, next) {
    try {
      const id = +req.params.id;
  
      if (!Number.isInteger(id)) {
        throw new UnprocessableEntity("Validation failed", [{user_id: "The user_id must be an integer."}]);
      }
  
      const user = await this.User.findByPk(id, {include: [this.Position]}).then(user => {
        const data = {...user.dataValues, position: user.dataValues.Position.name};
        delete data.Position;
        return data;
      });
  
      if (!user) {
        throw new NotFound("The user with the requested identifier does not exist", [{user_id: "User not found."}])
      }
      this.response(res, {user});
    } catch (err) {
      next(err);
    }
  }

  async getUsers(req, res, next) {
    try {
      const page = +req.query.page;
      const offset = Math.max(+req.query.offset, 0);
      const limit = Math.min(+req.query.count || 5, 100);
      const fails = [];

      if (!Number.isInteger(limit))  {
        fails.push({count: "The count must be an integer."});
      }
      if (!offset && page <= 0) {
        fails.push({page: "The page must be at least 1."});
      }
      if (fails.length) {
        throw new UnprocessableEntity("Validation failed", fails);
      }
      let users = [];
      let pageData = {};
      const total_users = await this.User.count();
      if (!page) {
        users = await this.User.findAll({limit, offset, include: [this.Position]})
          .then(users => users.map(user => {
            const data = {...user.dataValues, position: user.dataValues.Position.name};
            delete data.Position;
            return data
          }));
      } else {
        pageData.page = page;
        pageData.total_pages = Math.ceil(total_users / limit);
        pageData.links = {next_url: null, prev_url: null};
        if (page > pageData.total_pages) {
          throw NotFound("Page not found");
        }
        if (page > 1) {
          pageData.links.prev_url = this.config.usersUrl + `?page=${page - 1}&count=${limit}`;
        }
        if (page < pageData.total_pages) {
          pageData.links.next_url = this.config.usersUrl + `?page=${page + 1}&count=${limit}`;
        }
        users = await this.User.findAll({limit, offset: limit * (page - 1), include: [this.Position]})
          .then(users => users.map(user => {
            const data = {...user.dataValues, position: user.dataValues.Position.name};
            delete data.Position;
            return data
          }));
      }
      this.response(res, {count: users.length, ...pageData, total_users, users});
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ContentController;