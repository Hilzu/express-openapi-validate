import _ from "lodash";
import OpenApiDocument, {
  ParameterLocation,
  ParameterObject,
  ReferenceObject,
  SchemaObject,
} from "./OpenApiDocument";
import { resolveReference } from "./schema-utils";

export type Parameters = Array<ParameterObject | ReferenceObject> | undefined;

const normalizeParameters = (
  document: OpenApiDocument,
  parameters?: Array<ParameterObject | ReferenceObject>,
): { [name: string]: ParameterObject } =>
  _.keyBy(
    _.map(parameters, (p) => resolveReference<ParameterObject>(document, p)),
    "name",
  );

export function resolve(
  document: OpenApiDocument,
  pathParameters: Parameters,
  itemParameters: Parameters,
): ParameterObject[] {
  const parameters = {
    ...normalizeParameters(document, pathParameters),
    ...normalizeParameters(document, itemParameters),
  };
  return _.values(parameters);
}

const concatArraysCustomizer = <T>(
  objValue: T,
  srcValue: any,
): T[] | undefined =>
  Array.isArray(objValue) ? objValue.concat(srcValue) : undefined;

const parameterLocationToRequestField = (
  location: ParameterLocation,
): "headers" | "params" | "query" | "cookies" => {
  if (location === "header") {
    return "headers";
  }
  if (location === "path") {
    return "params";
  }
  if (location === "cookie") {
    return "cookies";
  }
  if (location === "query") {
    return "query";
  }
  throw new Error(`Unrecognized parameter location=${location}`);
};

export function buildSchema(
  parameterObjects: ParameterObject[],
): { [field: string]: SchemaObject } {
  const schema = { query: {}, headers: {}, params: {}, cookies: {} };
  parameterObjects.forEach((parameterObject) => {
    const location = parameterObject.in;
    const name =
      location === "header"
        ? parameterObject.name.toLowerCase()
        : parameterObject.name;
    const parameterSchema = {
      type: "object",
      properties: {
        [name]: parameterObject.schema,
      },
    };
    if (parameterObject.required) {
      (parameterSchema as any).required = [name];
    }
    _.mergeWith(
      schema[parameterLocationToRequestField(location)],
      parameterSchema,
      concatArraysCustomizer,
    );
  });
  return schema;
}
