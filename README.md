# express-openapi-validate

[![Build Status](https://travis-ci.org/Hilzu/express-openapi-validate.svg?branch=master)](https://travis-ci.org/Hilzu/express-openapi-validate)
[![codecov](https://codecov.io/gh/Hilzu/express-openapi-validate/branch/master/graph/badge.svg)](https://codecov.io/gh/Hilzu/express-openapi-validate)
[![npm version](https://badge.fury.io/js/express-openapi-validate.svg)](https://badge.fury.io/js/express-openapi-validate)

Express middleware to validate requests based on an [OpenAPI 3.0
document][openapi-3]. OpenAPI used to be called the Swagger specification before
version 3.

This package is in early development so most features that you would except are
missing.

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

## Public API

### `class OpenApiValidator`

```javascript
const { OpenApiValidator } = require("express-openapi-validate");
```

The main class of this package. Creates [JSON schema][json-schema] validators
for the given operations defined in an OpenAPI v3 document. In the background
[Ajv][ajv] is used to validate the request.

#### `public constructor(openApiDocument: OpenApiDocument): OpenApiValidator`

Creates a new validator for the given OpenAPI document.

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
[openapi-operation-object]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#operationObject
[openapi-path-item-object]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#path-item-object
[openapi-parameter-object]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#parameterObject
[openapi-request-body-object]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#request-body-object
[json-schema]: http://json-schema.org/
[ajv]: http://epoberezkin.github.io/ajv/
[ajv-error-objects]: http://epoberezkin.github.io/ajv/#error-objects
