# express-openapi-validate

[![Build Status](https://travis-ci.org/Hilzu/express-openapi-validate.svg?branch=master)](https://travis-ci.org/Hilzu/express-openapi-validate)
[![Coverage Status](https://coveralls.io/repos/github/Hilzu/express-openapi-validate/badge.svg?branch=master)](https://coveralls.io/github/Hilzu/express-openapi-validate?branch=master)
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

### `index.js`

```javascript
const fs = require("fs");
const express = require("express");
const { OpenApiValidator } = require("express-openapi-validate");
const jsYaml = require("js-yaml");

const app = express();
app.use(express.json());

const openApiDocument = jsYaml.safeLoad(
  fs.readFileSync("openapi.yaml", "utf-8"),
);
const validator = new OpenApiValidator(openApiDocument);

app.post("/echo", validator.validate("post", "/echo"), (req, res, next) => {
  res.json({ output: req.body.input });
});

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

Or using `match()`:

```javascript
// Apply to all requests
app.use(validator.match());

// On each request validator.validate("post", "/echo") is called automatically,
// if it has a matching specification in the OpenAPI schema
app.post("/echo", (req, res, next) => {
  res.json({ output: req.body.input });
});
```

### `openapi.yaml`

```yaml
openapi: 3.0.1
info:
  title: Example API with a single echo endpoint
  version: 1.0.0
components:
  schemas:
    Error:
      type: object
      properties:
        error:
          type: object
          properties:
            name:
              type: string
            message:
              type: string
            data:
              type: array
              items:
                type: object
          required:
            - name
            - message
      required:
        - error
  responses:
    error:
      description: Default error response with error object
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
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
        "200":
          description: Echoed input
          content:
            application/json:
              schema:
                type: object
                properties:
                  output:
                    type: string
        default:
          $ref: "#/components/responses/error"
```

## Supported features

- Validating request bodies with a schema (See [Request Body
  Object][openapi-request-body-object] and [Schema
  Object][openapi-schema-object])
  - All schema properties in a Schema Object that are directly supported by
    [JSON Schema][json-schema] and [Ajv][ajv] are used in validation
  - Schemas are validated according to [JSON Schema Specification Wright Draft
    00][json-schema-validation-05] (draft-04/05) as specified in [OpenAPI
    specification][openapi-data-types]
  - `nullable` field for handling properties that can be null is supported (See
    [OpenAPI fixed fields][openapi-fixed-fields])
  - Validation according to `format` including additional data type formats
    (like int32 and bytes) defined by OpenAPI (See [OpenAPI data
    types][openapi-data-types] and [Ajv formats][ajv-formats])
- Validating parameters: query, header, path and cookies (including signed
  cookies) (See [Parameter Object][openapi-parameter-object])
  - The same `schema` features that are supported for request bodies are also
    supported for parameters
  - `required` field for marking parameters that must be given is supported
- Validating response bodies and headers in tests (See [Responses
  Object][openapi-responses-object] and [Header Object][openapi-header-object])
- References to [Components Object][openapi-components-object] (See [Reference
  Object][openapi-reference-object])
- Typescript definitions are included in the package

### Currently unsupported features

- Validating request bodies with media type other than `application/json` (See
  `content` under [Request Body Object][openapi-request-body-object])
- Some [OpenAPI Schema Object specific fields][openapi-fixed-fields] are
  unsupported:
  - `deprecated`
  - `discriminator`
  - `xml`
- External references (references to other files and network resources) (See
  [Reference Object][openapi-reference-object])
- [Parameter Objects][openapi-parameter-object] (including [Header
  Objects][openapi-header-object]) that define shape using `content` and `style`
  (only `schema` is supported)
- Links and callbacks (See [Callback Object][openapi-callback-object] and [Link
  Object][openapi-link-object])
- Encodings (See [Encoding Object][openapi-encoding-object])

## Public API

### `class OpenApiValidator`

```javascript
const { OpenApiValidator } = require("express-openapi-validate");
```

The main class of this package. Creates [JSON schema][json-schema] validators
for the given operations defined in the OpenAPI document. In the background
[Ajv][ajv] is used to validate the request.

#### `constructor(openApiDocument: OpenApiDocument, options: ValidatorConfig = {}))`

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

#### `validate(method: Operation, path: string): RequestHandler`

Returns an express middleware function for the given operation. The operation
matching the given method and path has to be defined in the OpenAPI document or
this method throws.

The middleware validates the incoming request according to the `parameters` and
`requestBody` fields defined in the [Operation
Object][openapi-operation-object]. If the validation fails the `next` express
function is called with an
[`ValidationError`](#class-validationerror-extends-error).

See the [Parameter Object][openapi-parameter-object] and [Request Body
Object][openapi-request-body-object] sections of the OpenAPI specification for
details how to define schemas for operations.

`method` must be one of the valid operations of an [OpenAPI Path Item
Object][openapi-path-item-object]:
`"get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace"`.

`RequestHandler` is an express middleware function with the signature
`(req: Request, res: Response, next: NextFunction): any;`.

#### `match(): RequestHandler`

Returns an express middleware function which calls `validate()` based on the
request method and path. Using this function removes the need to specify
`validate()` middleware for each express endpoint individually.

Note that behaviour is different to `validate()` for routes where no schema is
specified: `validate()` will throw an exception if no matching route
specification is found in the OpenAPI schema. `match()` will not throw an
exception in this case; the request is simply not validated. Be careful to
ensure you OpenAPI schema contains validators for each endpoint if using
`match()`.

The following examples achieve the same result:

```javascript
// Using validate()
app.post("/echo", validator.validate("post", "/echo"), (req, res, next) => {
  res.json({ output: req.body.input });
});

// Using match()
app.use(validator.match());
app.post("/echo", (req, res, next) => {
  res.json({ output: req.body.input });
});
```

#### `validateResponse(method: Operation, path: string): (res: any) => void`

Creates a function for the given operation that can be used to validate
responses. Response validation is meant to be used in tests and not in
production code. See below for example usage.

For documentation of the `method` and `path` parameters see
[`validate`](#validatemethod-operation-path-string-requesthandler).

`res` is expected to have the shape
`{ statusCode: number, body: {}, headers: {}}`. The `statusCode` field can also
be called `status` and the `body` field can be called `data`. This means that
response objects from most request libraries should work out of the box.

If validation fails the validation function throws a
[`ValidationError`](#class-validationerror-extends-error). Otherwise it returns
`undefined`.

Example usage when using [Jest][jest] and [SuperTest][supertest]:

```javascript
import { OpenApiValidator } from "express-openapi-validate";
import fs from "fs";
import jsYaml from "js-yaml";
import request from "supertest";
import app from "./app";

const openApiDocument = jsYaml.safeLoad(
  fs.readFileSync("openapi.yaml", "utf-8"),
);
const validator = new OpenApiValidator(openApiDocument);

test("/echo responses", async () => {
  const validateResponse = validator.validateResponse("post", "/echo");
  let res = await request(app)
    .post("/echo")
    .send({});
  expect(validateResponse(res)).toBeUndefined();

  res = await request(app)
    .post("/echo")
    .send({ input: "Hello!" });
  expect(validateResponse(res)).toBeUndefined();
});
```

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

#### `message: string`

Human-readable error message about why the validation failed.

#### `statusCode: number = 400`

This field is always set to `400`. You can check this field in your express
error handler to decide what status code to send to the client when errors
happen.

#### `data: ErrorObject[]`

Machine-readable array of validation errors. [Ajv Error
Objects][ajv-error-objects] documentation contains a list of the fields in
`ErrorObject`.

[openapi-3]: https://github.com/OAI/OpenAPI-Specification
[openapi-callback-object]:
  https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#callbackObject
[openapi-components-object]:
  https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#componentsObject
[openapi-data-types]:
  https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#data-types
[openapi-encoding-object]:
  https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#encoding-object
[openapi-fixed-fields]:
  https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#fixed-fields-20
[openapi-formats]:
  https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#data-types
[openapi-header-object]:
  https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#headerObject
[openapi-link-object]:
  https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#linkObject
[openapi-operation-object]:
  https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#operationObject
[openapi-parameter-object]:
  https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#parameterObject
[openapi-path-item-object]:
  https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#path-item-object
[openapi-reference-object]:
  https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#referenceObject
[openapi-request-body-object]:
  https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#request-body-object
[openapi-responses-object]:
  https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#responsesObject
[openapi-schema-object]:
  https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#schemaObject
[json-schema]: http://json-schema.org/
[json-schema-validation-05]:
  https://tools.ietf.org/html/draft-wright-json-schema-validation-00
[ajv]: http://epoberezkin.github.io/ajv/
[ajv-error-objects]: http://epoberezkin.github.io/ajv/#error-objects
[ajv-formats]: http://epoberezkin.github.io/ajv/#formats
[ajv-options]: http://epoberezkin.github.io/ajv/#options
[i8]: https://github.com/Hilzu/express-openapi-validate/issues/8
[jest]: https://facebook.github.io/jest/
[supertest]: https://github.com/visionmedia/supertest
