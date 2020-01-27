/*
  Copyright 2018 Santeri Hiltunen

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import draft04Schema from "ajv/lib/refs/json-schema-draft-04.json";
// eslint-disable-next-line import/no-extraneous-dependencies
import { RequestHandler } from "express";
import * as _ from "lodash";
import { pathToRegexp } from "path-to-regexp";
import * as semver from "semver";

import debug from "./debug";
import * as formats from "./formats";
import OpenApiDocument, {
  Operation,
  OperationObject,
  PathItemObject,
  SchemaObject,
} from "./OpenApiDocument";
import * as parameters from "./parameters";
import {
  mapOasSchemaToJsonSchema,
  oasPathToExpressPath,
  resolveReference,
} from "./schema-utils";
import ValidationError from "./ValidationError";
// tslint:disable-next-line ordered-imports
import Ajv = require("ajv");

const resolveResponse = (res: any): any => {
  if (res == null) {
    throw new TypeError(`Response was ${String(res)}`);
  }
  const statusCodeNum = Number(res.statusCode || res.status);
  const statusCode = Number.isNaN(statusCodeNum) ? null : statusCodeNum;
  const body = res.body || res.data;
  const { headers } = res;
  if (statusCode == null || body == null || headers == null) {
    throw new TypeError(
      "statusCode, body or header values not found from response",
    );
  }
  return { statusCode, body, headers };
};

export interface ValidatorConfig {
  ajvOptions?: Ajv.Options;
}

export interface PathRegexpObject {
  path: string;
  regex: RegExp;
}

export default class OpenApiValidator {
  private _ajv: Ajv.Ajv;

  private _document: OpenApiDocument;

  constructor(openApiDocument: OpenApiDocument, options: ValidatorConfig = {}) {
    if (!semver.satisfies(openApiDocument.openapi, "^3.0.0")) {
      const version =
        openApiDocument.openapi || (openApiDocument as any).swagger;
      throw new Error(`Unsupported OpenAPI / Swagger version=${version}`);
    }
    this._document = openApiDocument;
    const userAjvFormats = _.get(options, ["ajvOptions", "formats"], {});
    const ajvOptions: Ajv.Options = {
      ...options.ajvOptions,
      formats: { ...formats, ...userAjvFormats },
      schemaId: "id",
      meta: false,
    };
    this._ajv = new Ajv(ajvOptions);
    this._ajv.removeKeyword("propertyNames");
    this._ajv.removeKeyword("contains");
    this._ajv.removeKeyword("const");
    this._ajv.addMetaSchema(draft04Schema);
  }

  public validate(method: Operation, path: string): RequestHandler {
    const pathItemObject = this._getPathItemObject(path);
    const operation = this._getOperationObject(method, path);
    const requestBodyObject = resolveReference(
      this._document,
      _.get(operation, ["requestBody"], {}),
    );
    const bodySchema = _.get(
      requestBodyObject,
      ["content", "application/json", "schema"],
      {},
    );

    const params = parameters.resolve(
      this._document,
      pathItemObject.parameters,
      operation.parameters,
    );
    const parametersSchema = parameters.buildSchema(params);
    const schema = {
      properties: {
        body: resolveReference(this._document, bodySchema),
        ...parametersSchema,
      },
      required: ["query", "headers", "params"],
    };
    if (!_.isEmpty(parametersSchema.cookies)) {
      schema.required.push("cookies");
    }

    if (_.get(requestBodyObject, ["required"]) === true) {
      schema.required.push("body");
    }
    const jsonSchema = mapOasSchemaToJsonSchema(schema, this._document);
    const validator = this._ajv.compile(jsonSchema);
    debug(`Request JSON Schema for ${method} ${path}: %j`, jsonSchema);

    const validate: RequestHandler = (req, res, next) => {
      const reqToValidate = {
        ...req,
        cookies: req.cookies
          ? { ...req.cookies, ...req.signedCookies }
          : undefined,
      };
      const valid = validator(reqToValidate);
      if (valid) {
        next();
      } else {
        const errors = validator.errors as Ajv.ErrorObject[];
        const errorText = this._ajv.errorsText(errors, { dataVar: "request" });
        const err = new ValidationError(
          `Error while validating request: ${errorText}`,
          errors,
        );
        next(err);
      }
    };

    return validate;
  }

  public match(): RequestHandler {
    const paths: PathRegexpObject[] = _.keys(this._document.paths).map(
      path => ({
        path,
        regex: pathToRegexp(oasPathToExpressPath(path)),
      }),
    );
    const matchAndValidate: RequestHandler = (req, res, next) => {
      const match = paths.find(({ regex }) => regex.test(req.path));
      if (match) {
        const method = req.method.toLowerCase() as Operation;
        this.validate(method, match.path)(req, res, next);
      } else {
        next();
      }
    };
    return matchAndValidate;
  }

  public validateResponse(method: Operation, path: string): (res: any) => void {
    const operation = this._getOperationObject(method, path);
    const validateResponse = (userResponse: any): void => {
      const { statusCode, ...response } = resolveResponse(userResponse);
      const responseObject = this._getResponseObject(operation, statusCode);
      const bodySchema = _.get(
        responseObject,
        ["content", "application/json", "schema"],
        {},
      );

      const headerObjectMap = _.get(responseObject, ["headers"], {});
      const headersSchema: SchemaObject = {
        type: "object",
        properties: {},
      };
      Object.keys(headerObjectMap).forEach(key => {
        const headerObject = resolveReference(
          this._document,
          headerObjectMap[key],
        );
        const name = key.toLowerCase();
        if (name === "content-type") {
          return;
        }
        if (headerObject.required === true) {
          if (!Array.isArray(headersSchema.required)) {
            headersSchema.required = [];
          }
          headersSchema.required.push(name);
        }
        (headersSchema.properties as any)[name] = resolveReference(
          this._document,
          headerObject.schema || {},
        );
      });

      const schema = mapOasSchemaToJsonSchema(
        {
          type: "object",
          properties: {
            body: resolveReference(this._document, bodySchema),
            headers: headersSchema,
          },
          required: ["headers", "body"],
        },
        this._document,
      );

      debug(
        `Response JSON Schema for ${method} ${path} ${statusCode}: %j`,
        schema,
      );

      const valid = this._ajv.validate(schema, response);
      if (!valid) {
        const errorText = this._ajv.errorsText(this._ajv.errors, {
          dataVar: "response",
        });
        throw new ValidationError(
          `Error while validating response: ${errorText}`,
          this._ajv.errors as Ajv.ErrorObject[],
        );
      }
    };
    return validateResponse;
  }

  private _getResponseObject(op: OperationObject, statusCode: number): any {
    const statusCodeStr = String(statusCode);
    let responseObject = _.get(op, ["responses", statusCodeStr], null);
    if (responseObject === null) {
      const field = `${statusCodeStr[0]}XX`;
      responseObject = _.get(op, ["responses", field], null);
    }
    if (responseObject === null) {
      responseObject = _.get(op, ["responses", "default"], null);
    }
    if (responseObject === null) {
      throw new Error(
        `No response object found with statusCode=${statusCodeStr}`,
      );
    }
    return resolveReference(this._document, responseObject);
  }

  private _getPathItemObject(path: string): PathItemObject {
    if (_.has(this._document, ["paths", path])) {
      return this._document.paths[path] as PathItemObject;
    }
    throw new Error(`Path=${path} not found from OpenAPI document`);
  }

  private _getOperationObject(
    method: Operation,
    path: string,
  ): OperationObject {
    if (_.has(this._document, ["paths", path, method])) {
      return this._document.paths[path][method] as OperationObject;
    }
    throw new Error(
      `Path=${path} with method=${method} not found from OpenAPI document`,
    );
  }
}
