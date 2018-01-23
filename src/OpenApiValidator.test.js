"use strict";

const OpenApiValidator = require("./OpenApiValidator");

const minimumValidOpenApiDocument = {
  openapi: "3.0.1",
  info: { title: "Example API", version: "1.0.0" },
  paths: {},
};

const openApiDocument = Object.assign({}, minimumValidOpenApiDocument, {
  paths: {
    "/echo": {
      post: {
        description: "Echo input back",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  input: {
                    type: "string",
                  },
                },
                required: ["input"],
              },
            },
          },
        },
        responses: {
          200: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    output: {
                      type: "string",
                    },
                  },
                  required: ["output"],
                },
              },
            },
          },
        },
      },
    },
  },
});

describe("OpenApiValidator", () => {
  test("can be created with valid OpenAPI document", () => {
    const validator = new OpenApiValidator(minimumValidOpenApiDocument);
    expect(validator).toBeInstanceOf(OpenApiValidator);
  });

  test("creating throws with Swagger 2.0 document", () => {
    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const validator = new OpenApiValidator({
        swagger: "2.0",
        info: { title: "Swagger API", version: "1.0.0" },
        paths: {},
      });
    }).toThrowErrorMatchingSnapshot();
  });

  test("getting an operation object fails with invalid arguments", () => {
    const validator = new OpenApiValidator(openApiDocument);

    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const op = validator.getOperationObject("POST", "/echo");
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const op = validator.getOperationObject("ppost", "/echo");
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const op = validator.getOperationObject("post", "/echoo");
    }).toThrowErrorMatchingSnapshot();
  });

  test("getting an operation object succeeds", () => {
    const validator = new OpenApiValidator(openApiDocument);
    const op = validator.getOperationObject("post", "/echo");
    expect(op).toEqual(openApiDocument.paths["/echo"].post);
  });

  test("validate", done => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validate("post", "/echo");
    validate({ body: { input: "hello" }}, {}, err => {
      expect(err).toBeUndefined();
      done();
    });
  });

  test("validate with invalid body", done => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validate("post", "/echo");
    validate({ body: {} }, {}, err => {
      expect(err).toBeInstanceOf(Error);
      expect(err).toMatchSnapshot();
      done();
    });
  });
});
