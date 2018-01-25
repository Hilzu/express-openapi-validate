"use strict";

const fs = require("fs");
const jsYaml = require("js-yaml");
const OpenApiValidator = require("../dist/OpenApiValidator").default;

const openApiDocument = jsYaml.safeLoad(
  fs.readFileSync("./openapi.yaml", "utf-8")
);

describe("OpenApiValidator", () => {
  test("can be created with valid OpenAPI document", () => {
    const validator = new OpenApiValidator(openApiDocument);
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
    validate({ body: { input: "hello" } }, {}, err => {
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

  test("resolveSchema throws with unsupported $ref", () => {
    const validator = new OpenApiValidator(openApiDocument);
    expect(() => {
      validator.resolveSchema({ $ref: "#/a/b/C" });
    }).toThrowErrorMatchingSnapshot();
  });

  test("validate with schema in internal ref", done => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validate("post", "/test");
    validate({ body: { value: 123 } }, {}, err => {
      expect(err).toBeUndefined();
      done();
    });
  });

  test("validate with schema in internal ref fails with invalid body", done => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validate("post", "/test");
    validate({ body: { value: "123" } }, {}, err => {
      expect(err).toBeInstanceOf(Error);
      expect(err).toMatchSnapshot();
      done();
    });
  });
});
