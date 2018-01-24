import * as Ajv from "ajv";
// eslint-disable-next-line
import { RequestHandler } from "express";
import * as _ from "lodash";
import * as semver from "semver";

import OpenApiDocument, { Operation, OperationObject } from "./OpenApiDocument";
import ValidationError from "./ValidationError";

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

  public validate(method: Operation, path: string): RequestHandler {
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
          validator.errors as Ajv.ErrorObject[]
        );
        next(err);
      }
    };
    return validate;
  }

  private getOperationObject(method: Operation, path: string): OperationObject {
    if (_.has(this.document, ["paths", path, method])) {
      return this.document.paths[path][method] as OperationObject;
    }
    throw new Error(
      `Path=${path} with method=${method} not found from OpenAPI document`
    );
  }
}
