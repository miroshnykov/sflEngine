const createError = require('http-errors');

module.exports = (req, res, next) => next(new createError.NotFound());
