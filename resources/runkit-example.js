const jsYaml = require("js-yaml");
const {
  OpenApiValidator,
  ValidationError,
} = require("express-openapi-validate");

const openApiDocument = jsYaml.safeLoad(`
openapi: 3.0.1
info:
  title: Test API
  version: 1.0.0
paths:
  /echo:
    post:
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
        required: true
      responses:
        200:
          description: Echoed input
`);

const validator = new OpenApiValidator(openApiDocument);
// This is the express middleware that does the validation
const validate = validator.validate("post", "/echo");
const fakeRequest = {
  body: {},
  query: {},
  headers: {},
  cookies: {},
  params: {},
};
const fakeResponse = {};
const nextFunction = (err) => {
  console.log("Error passed to next:", err);
};

validate(fakeRequest, fakeResponse, nextFunction);
const requestWithBody = Object.assign({}, fakeRequest, {
  body: { input: "Hello!" },
});
validate(requestWithBody, fakeResponse, nextFunction);
