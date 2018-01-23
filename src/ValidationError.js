"use strict";

class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 400;
    this.data = errors;
  }
}

module.exports = ValidationError;
