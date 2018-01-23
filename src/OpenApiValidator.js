"use strict";

const Ajv = require("ajv");
const _ = require("lodash");
const semver = require("semver");
const ValidationError = require("./ValidationError");

const validMethods = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
];

class OpenApiValidator {
  constructor(openApiDocument) {
    if (!semver.satisfies(openApiDocument.openapi, "^3.0.0")) {
      const version = openApiDocument.openapi || openApiDocument.swagger;
      throw new Error(`Unsupported OpenAPI / Swagger version=${version}`);
    }
    this.document = openApiDocument;
    this.ajv = new Ajv();
  }

  getOperationObject(method, path) {
    if (!validMethods.includes(method)) {
      throw new Error(`Not a valid method=${method}`);
    }
    try {
      return this.document.paths[path][method];
    } catch (err) {
      throw new Error(
        `Path=${path} with method=${method} not found from OpenAPI document`
      );
    }
  }

  validate(method, path) {
    const operation = this.getOperationObject(method, path);
    const schema = {
      properties: {
        body: _.get(
          operation,
          ["requestBody", "content", "application/json", "schema"],
          {}
        ),
      },
      required: ["body"],
    };
    const validator = this.ajv.compile(schema);
    const validate = (req, res, next) => {
      const valid = validator(req);
      if (valid) {
        next();
      } else {
        const err = new ValidationError(
          "Error while validating request parameters",
          validator.errors
        );
        next(err);
      }
    };
    return validate;
  }
}

module.exports = OpenApiValidator;
