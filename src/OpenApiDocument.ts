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

export default interface OpenApiDocument {
  openapi: string;
  info: InfoObject;
  servers?: any[];
  paths: PathsObject;
  components?: ComponentsObject;
  security?: any[];
  tags?: any[];
  externalDocs?: any;
}

export interface InfoObject {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: any;
  license?: any;
  version: string;
}

export interface SchemaObject {
  type?: string;
  items?: SchemaObject;
  properties?: { [property: string]: SchemaObject };
  nullable?: boolean;
  required?: string[];
  allOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  not?: SchemaObject;
  additionalProperties?: boolean | SchemaObject;
}

export interface ComponentsObject {
  schemas?: { [index: string]: SchemaObject };
  responses?: { [index: string]: any };
  parameters?: { [index: string]: any };
  examples?: { [index: string]: any };
  requestBodies?: { [index: string]: any };
  headers?: { [index: string]: any };
  securitySchemes?: { [index: string]: any };
  links?: { [index: string]: any };
  callbacks?: { [index: string]: any };
}

export type Operation =
  | "get"
  | "put"
  | "post"
  | "delete"
  | "options"
  | "head"
  | "patch"
  | "trace";

export interface PathsObject {
  [path: string]: PathItemObject;
}

export interface PathItemObject {
  $ref?: string;
  summary?: string;
  description?: string;
  get?: OperationObject;
  put?: OperationObject;
  post?: OperationObject;
  delete?: OperationObject;
  options?: OperationObject;
  head?: OperationObject;
  patch?: OperationObject;
  trace?: OperationObject;
  servers?: any[];
  parameters?: Array<ParameterObject | ReferenceObject>;
}

export interface OperationObject {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: any;
  operationId?: any;
  parameters?: Array<ParameterObject | ReferenceObject>;
  requestBody?: RequestBodyObject;
  responses: any;
  callbacks?: any;
  deprecated?: boolean;
  security?: any[];
  servers?: any[];
}

export type ParameterLocation = "query" | "header" | "path" | "cookie";

export type ParameterStyle =
  | "matrix"
  | "label"
  | "form"
  | "simple"
  | "spaceDelimited"
  | "pipeDelimited"
  | "deepObject";

export interface ParameterObject {
  name: string;
  in: ParameterLocation;
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: ParameterStyle;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: SchemaObject | ReferenceObject;
  example?: any;
  examples?: { [mediaType: string]: any };
  content?: { [mediaType: string]: MediaTypeObject };
}

export interface RequestBodyObject {
  description?: string;
  required?: boolean;
  content: { [mediaType: string]: MediaTypeObject };
}

export interface MediaTypeObject {
  schema?: SchemaObject | ReferenceObject;
  example?: any;
  examples?: any;
  encoding?: any;
}

export interface ReferenceObject {
  $ref: string;
}
