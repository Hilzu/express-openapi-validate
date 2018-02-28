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

import * as Ajv from "ajv";
// eslint-disable-next-line
import { RequestHandler } from "express";
import * as _ from "lodash";
import * as semver from "semver";

import * as formats from "./formats";
import OpenApiDocument, {
  Operation,
  OperationObject,
  ParameterLocation,
  SchemaObject,
} from "./OpenApiDocument";
import { mapOasSchemaToJsonSchema, resolveReference } from "./schema-utils";
import ValidationError from "./ValidationError";

const concatArraysCustomizer = <T>(
  objValue: T,
  srcValue: any
): T[] | undefined =>
  Array.isArray(objValue) ? objValue.concat(srcValue) : undefined;

const parameterLocationToRequestField = (
  location: ParameterLocation
): "headers" | "params" | "query" | "cookies" => {
  if (location === "header") {
    return "headers";
  } else if (location === "path") {
    return "params";
  } else if (location === "cookie") {
    return "cookies";
  } else if (location === "query") {
    return "query";
  }
  throw new Error(`Unrecognized parameter location=${location}`);
};

const resolveResponse = (res: any) => {
  if (res == null) {
    throw new TypeError(`Response was ${String(res)}`);
  }
  const statusCodeNum = Number(res.statusCode || res.status);
  const statusCode = Number.isNaN(statusCodeNum) ? null : statusCodeNum;
  const body = res.body || res.data;
  const { headers } = res;
  if (statusCode == null || body == null || headers == null) {
    throw new TypeError(
      "statusCode, body or header values not found from response"
    );
  }
  return { statusCode, body, headers };
};

export interface ValidatorConfig {
  ajvOptions?: Ajv.Options;
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
    const ajvOptions = {
      ...options.ajvOptions,
      formats: { ...formats, ...userAjvFormats },
    };
    this._ajv = new Ajv(ajvOptions);
  }

  public validate(method: Operation, path: string): RequestHandler {
    const operation = this._getOperationObject(method, path);
    const bodySchema = _.get(
      operation,
      ["requestBody", "content", "application/json", "schema"],
      {}
    );
    const parametersSchema = this._parameterObjectsToSchema(operation);
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
    if (_.get(operation, ["requestBody", "required"]) === true) {
      schema.required.push("body");
    }
    const validator = this._ajv.compile(mapOasSchemaToJsonSchema(schema));

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
          errors
        );
        next(err);
      }
    };

    return validate;
  }

  public validateResponse(method: Operation, path: string): (res: any) => void {
    const operation = this._getOperationObject(method, path);
    const validateResponse = (userResponse: any) => {
      const { statusCode, ...response } = resolveResponse(userResponse);
      const responseObject = this._getResponseObject(operation, statusCode);
      const bodySchema = _.get(
        responseObject,
        ["content", "application/json", "schema"],
        {}
      );

      const headerObjectMap = _.get(responseObject, ["headers"], {});
      const headersSchema = {
        required: [] as string[],
        type: "object",
        properties: {},
      };
      Object.keys(headerObjectMap).forEach(key => {
        const headerObject = headerObjectMap[key];
        const name = key.toLowerCase();
        if (name === "content-type") {
          return;
        }
        if (headerObject.required === true) {
          headersSchema.required.push(name);
        }
        (headersSchema.properties as any)[name] = resolveReference(
          this._document,
          headerObject.schema || {}
        );
      });

      const schema = mapOasSchemaToJsonSchema({
        type: "object",
        properties: {
          body: resolveReference(this._document, bodySchema),
          headers: headersSchema,
        },
        required: ["headers", "body"],
      });

      const valid = this._ajv.validate(schema, response);
      if (!valid) {
        const errorText = this._ajv.errorsText(this._ajv.errors, {
          dataVar: "response",
        });
        throw new ValidationError(
          `Error while validating response: ${errorText}`,
          this._ajv.errors as Ajv.ErrorObject[]
        );
      }
    };
    return validateResponse;
  }

  private _getResponseObject(op: OperationObject, statusCode: number) {
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
        `No response object found with statusCode=${statusCodeStr}`
      );
    }
    return resolveReference(this._document, responseObject);
  }

  private _parameterObjectsToSchema(
    op: OperationObject
  ): { [field: string]: SchemaObject } {
    const schema = { query: {}, headers: {}, params: {}, cookies: {} };
    const parameterObjects = op.parameters;
    if (Array.isArray(parameterObjects)) {
      parameterObjects.forEach(po => {
        const parameterObject = resolveReference(this._document, po);
        const location = parameterObject.in;
        const parameterSchema = {
          type: "object",
          properties: {
            [parameterObject.name]: resolveReference(
              this._document,
              parameterObject.schema || {}
            ),
          },
        };
        if (parameterObject.required) {
          (parameterSchema as any).required = [parameterObject.name];
        }
        _.mergeWith(
          schema[parameterLocationToRequestField(location)],
          parameterSchema,
          concatArraysCustomizer
        );
      });
    }
    return schema;
  }

  private _getOperationObject(
    method: Operation,
    path: string
  ): OperationObject {
    if (_.has(this._document, ["paths", path, method])) {
      return this._document.paths[path][method] as OperationObject;
    }
    throw new Error(
      `Path=${path} with method=${method} not found from OpenAPI document`
    );
  }
}
