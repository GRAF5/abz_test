function handler(err, req, res, next) {
  res.status(err.status || 500);
  res.json(compose(err));
}

function compose(err) {
  let response = {
    success: false,
    message: err.message
  };

  if (err.fails) {
    response.fails = err.fails.reduce((prev, curr) => {
      const key = Object.keys(curr).shift();
      prev[key] = prev[key] || [];
      prev[key].push(curr[key]);
      return prev;
    }, {});
  }

  return response;
}

class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.status = 401;
  }
}

class NotFound extends Error {
  constructor(message, fails) {
    super(message);
    this.status = 404;
    this.fails = fails;
  }
}

class UnprocessableEntity extends Error {
  constructor(message, fails) {
    super(message);
    this.fails = fails;
    this.status = 422;
  }
}

module.exports = {
  handler,
  BadRequestError,
  UnauthorizedError,
  NotFound,
  UnprocessableEntity
};