# express-openapi-validate

[![Build Status](https://travis-ci.org/Hilzu/express-openapi-validate.svg?branch=master)](https://travis-ci.org/Hilzu/express-openapi-validate)
[![codecov](https://codecov.io/gh/Hilzu/express-openapi-validate/branch/master/graph/badge.svg)](https://codecov.io/gh/Hilzu/express-openapi-validate)
[![npm version](https://badge.fury.io/js/express-openapi-validate.svg)](https://badge.fury.io/js/express-openapi-validate)
[![Try on RunKit](https://badge.runkitcdn.com/express-openapi-validate.svg)](https://npm.runkit.com/express-openapi-validate)

Express middleware to validate requests based on an [OpenAPI 3.0
document][openapi-3]. OpenAPI specification was called the Swagger specification
before version 3.

## Usage

Install this package with npm or yarn:

```bash
npm install --save express-openapi-validate
# or
yarn add express-openapi-validate
```

Then use the validator like this:

```javascript
const fs = require("fs");
const express = require("express");
const { OpenApiValidator } = require("express-openapi-validate");
const jsYaml = require("js-yaml");

const app = express();
app.use(express.json());

const openApiDocument = jsYaml.safeLoad(
  fs.readFileSync("openapi.yaml", "utf-8")
);
const openApiValidator = new OpenApiValidator(openApiDocument);

app.post(
  "/echo",
  openApiValidator.validate("post", "/echo"),
  (req, res, next) => {
    res.json({ output: req.body.input });
  }
);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      name: err.name,
      message: err.message,
      data: err.data,
    },
  });
});

const server = app.listen(3000, () => {
  console.log("Listening on", server.address());
});
```

```yaml
# openapi.yaml
openapi: 3.0.1
info:
  title: Example API
  version: 1.0.0
paths:
  /echo:
    post:
      description: Echo input back
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                input:
                  type: string
              required:
                - input
      responses:
        200:
          description: Echoed input
          content:
            application/json:
              schema:
                type: object
                properties:
                  output:
                    type: string
```

## Supported features

* Validating request bodies according to schema (See [Request Body
  Object][openapi-request-body-object])
  * All schema properties in a [Schema Object][openapi-schema-object] that are
    directly supported by [JSON Schema][json-schema] and [Ajv][ajv] work.
  * `nullable` property (See [OpenAPI fixed fields][openapi-fixed-fields])
  * Validation according to `format` including additional data type formats
    (like int32 and bytes) defined by OpenAPI (See [OpenAPI data
    types][openapi-data-types])
  * Schemas that are references to [Components
    Object][openapi-components-object]
* Validating parameters: query, header, path and cookies (including signed
  cookies) (See [Parameter Object][openapi-parameter-object])
  * `required` field is supported
  * Validating according to `schema` field
  * Parameters can be references to Components Object
* Typescript definitions are included in package

### Currently unsupported features

* Validating request bodies with media type other than `application/json` (See
  `content` under [Request Body Object][openapi-request-body-object])
* References outside the components object in the document (See [Reference
  Object][openapi-reference-object] and [Components
  Object][openapi-components-object])
  * This means references to other local documents and also to external schemas

## Public API

### `class OpenApiValidator`

```javascript
const { OpenApiValidator } = require("express-openapi-validate");
```

The main class of this package. Creates [JSON schema][json-schema] validators
for the given operations defined in an OpenAPI v3 document. In the background
[Ajv][ajv] is used to validate the request.

#### `public constructor(openApiDocument: OpenApiDocument, options: ValidatorConfig = {}))`

Creates a new validator for the given OpenAPI document.

`options` parameter is optional. It has the following optional fields:

```javascript
{
  ajvOptions: Ajv.Options;
}
```

You can find the list of options accepted by Ajv from its
[documentation][ajv-options]. The `formats` object passed to Ajv will be merged
with additional [OpenAPI formats][openapi-formats] supported by this library.

#### `public validate(method: Operation, path: string): RequestHandler`

Returns an express middleware function for the given operation. The operation
matching the given method and path has to be defined in the OpenAPI document or
this method throws. The middleware validates the incoming request according to
the `parameters` and `requestBody` fields defined in the [Operation
Object][openapi-operation-object]. If the validation fails the `next` express
function is called with an `ValidationError`.

See the [Parameter Object][openapi-parameter-object] and [Request Body
Object][openapi-request-body-object] sections of the OpenAPI specification for
details how to define schemas for requests.

`method` must be one of the valid operations of an [OpenAPI Path Item
Object][openapi-path-item-object]:
`"get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace"`.

`RequestHandler` is an express middleware function with the signature
`(req: Request, res: Response, next: NextFunction): any;`.

### `class ValidationError extends Error`

```javascript
const { ValidationError } = require("express-openapi-validate");
```

This error is thrown by `OpenApiValidator#validate` when the request validation
fails. It contains useful information about why the validation failed in
human-readable format in the `.message` field and in machine-readable format in
the `.data` array.

You can catch this error in your express error handler and handle it specially.
You probably want to log the validation error and pass the errors to the client.

#### `public message: string`

Human-readable error message about why the validation failed.

#### `public statusCode: number = 400`

This field is always set to `400`. You can check this field in your express
error handler to decide what status code to send to the client when errors
happen.

#### `public data: ErrorObject[]`

Machine-readable array of validation errors. [Ajv Error
Objects][ajv-error-objects] documentation contains a list of the fields in
`ErrorObject`.

[openapi-3]: https://github.com/OAI/OpenAPI-Specification
[openapi-components-object]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#componentsObject
[openapi-data-types]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#data-types
[openapi-fixed-fields]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#fixed-fields-20
[openapi-formats]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#data-types
[openapi-operation-object]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#operationObject
[openapi-path-item-object]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#path-item-object
[openapi-parameter-object]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#parameterObject
[openapi-request-body-object]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#request-body-object
[openapi-reference-object]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#referenceObject
[openapi-schema-object]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#schemaObject
[json-schema]: http://json-schema.org/
[ajv]: http://epoberezkin.github.io/ajv/
[ajv-error-objects]: http://epoberezkin.github.io/ajv/#error-objects
[ajv-options]: http://epoberezkin.github.io/ajv/#options
