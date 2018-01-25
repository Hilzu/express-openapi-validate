export default interface OpenApiDocument {
  openapi: string;
  info: InfoObject;
  servers?: any[];
  paths: PathsObject;
  components?: ComponentsObject;
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

export type SchemaObject = any;

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
