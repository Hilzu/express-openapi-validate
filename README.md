# express-openapi-validate

[![Travis](https://img.shields.io/travis/Hilzu/express-openapi-validate.svg)](https://travis-ci.org/Hilzu/express-openapi-validate)
[![Codecov](https://img.shields.io/codecov/c/github/Hilzu/express-openapi-validate.svg)](https://codecov.io/gh/Hilzu/express-openapi-validate)
[![npm](https://img.shields.io/npm/v/express-openapi-validate.svg)](https://www.npmjs.com/package/express-openapi-validate)

Express middleware to validate request based on an [OpenAPI 3.0
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
const OpenApiValidator = require("express-openapi-validate");
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
          content:
            application/json:
              schema:
                type: object
                properties:
                  output:
                    type: string
```

[openapi-3]: https://github.com/OAI/OpenAPI-Specification
