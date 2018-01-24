import * as Ajv from "ajv";
import * as _ from "lodash";
import * as semver from "semver";
// eslint-disable-next-line
import { RequestHandler } from "express";
import ValidationError from "./ValidationError";
import OpenApiDocument, { Operation, OperationObject } from "./OpenApiDocument";

export default class OpenApiValidator {
  private ajv: Ajv.Ajv;
  private document: OpenApiDocument;

  constructor(openApiDocument: OpenApiDocument) {
    if (!semver.satisfies(openApiDocument.openapi, "^3.0.0")) {
      const version =
        openApiDocument.openapi || (openApiDocument as any).swagger;
      throw new Error(`Unsupported OpenAPI / Swagger version=${version}`);
    }
    this.document = openApiDocument;
    this.ajv = new Ajv();
  }

  getOperationObject(method: Operation, path: string): OperationObject {
    if (_.has(this.document, ["paths", path, method])) {
      return this.document.paths[path][method] as OperationObject;
    }
    throw new Error(
      `Path=${path} with method=${method} not found from OpenAPI document`
    );
  }

  validate(method: Operation, path: string): RequestHandler {
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
    const validate: RequestHandler = (req, res, next) => {
      const valid = validator(req);
      if (valid) {
        next();
      } else {
        const err = new ValidationError(
          "Error while validating request parameters",
          <Ajv.ErrorObject[]>validator.errors
        );
        next(err);
      }
    };
    return validate;
  }
}
