export default interface OpenApiDocument {
  openapi: string;
  info: InfoObject;
  servers?: any[];
  paths: PathsObject;
  components?: any;
  security?: any[];
  tags?: any[];
  externalDocs?: any;
};

export interface InfoObject {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: any;
  license?: any;
  version: string;
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
  [index: string]: PathItemObject;
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
  parameters?: any[];
}

export interface OperationObject {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: any;
  operationId?: any;
  parameters?: any[];
  requestBody?: RequestBodyObject;
  responses: any;
  callbacks?: any;
  deprecated?: boolean;
  security?: any[];
  servers?: any[];
}

export interface RequestBodyObject {
  description?: string;
  required?: boolean;
  content: { [content: string]: MediaTypeObject };
}

export interface MediaTypeObject {
  schema?: any;
  example?: any;
  examples?: any;
  encoding?: any;
}
