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

import OpenApiDocument, {
  Operation,
  OperationObject,
  ParameterLocation,
  ReferenceObject,
  SchemaObject,
} from "./OpenApiDocument";
import { mapOasSchemaToJsonSchema } from "./schema-utils";
import ValidationError from "./ValidationError";

const isReferenceObject = <T>(x: T | ReferenceObject): x is ReferenceObject =>
  (x as ReferenceObject).$ref !== undefined;

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

export default class OpenApiValidator {
  private _ajv: Ajv.Ajv;
  private _document: OpenApiDocument;

  constructor(openApiDocument: OpenApiDocument) {
    if (!semver.satisfies(openApiDocument.openapi, "^3.0.0")) {
      const version =
        openApiDocument.openapi || (openApiDocument as any).swagger;
      throw new Error(`Unsupported OpenAPI / Swagger version=${version}`);
    }
    this._document = openApiDocument;
    this._ajv = new Ajv();
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
        body: this._resolveSchema(bodySchema),
        ...parametersSchema,
      },
      required: ["body", "query", "headers", "params"],
    };
    if (!_.isEmpty(parametersSchema.cookies)) {
      schema.required.push("cookies");
    }
    const validator = this._ajv.compile(mapOasSchemaToJsonSchema(schema));
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

  private _parameterObjectsToSchema(
    op: OperationObject
  ): { [field: string]: SchemaObject } {
    const schema = { query: {}, headers: {}, params: {}, cookies: {} };
    const parameterObjects = op.parameters;
    if (Array.isArray(parameterObjects)) {
      parameterObjects.forEach(parameterObject => {
        const location = parameterObject.in;
        const parameterSchema = {
          type: "object",
          properties: {
            [parameterObject.name]: this._resolveSchema(
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

  private _resolveSchema(schema: SchemaObject | ReferenceObject): SchemaObject {
    if (isReferenceObject(schema)) {
      if (!schema.$ref.startsWith("#/components/schemas/")) {
        throw new Error(`Unsupported $ref=${schema.$ref}`);
      }
      const name = _.last(schema.$ref.split("/")) as string;
      const schemaPath = ["components", "schemas", name];
      const resolvedSchema = _.get(this._document, schemaPath);
      if (resolvedSchema === undefined) {
        throw new Error(`Schema not found with $ref=${schema.$ref}`);
      }
      return resolvedSchema;
    }
    return schema;
  }
}
