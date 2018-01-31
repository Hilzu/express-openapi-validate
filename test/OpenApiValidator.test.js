"use strict";

const fs = require("fs");
const _ = require("lodash");
const jsYaml = require("js-yaml");
const OpenApiValidator = require("../dist/OpenApiValidator").default;
const ValidationError = require("../dist/ValidationError").default;

const openApiDocument = jsYaml.safeLoad(
  fs.readFileSync("./test/openapi.yaml", "utf-8")
);

const baseReq = { body: {}, query: {}, headers: {}, cookies: {}, params: {} };

const assoc = (obj, property, value) =>
  Object.assign({}, obj, { [property]: value });

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
    validate(assoc(baseReq, "body", { input: "hello" }), {}, err => {
      expect(err).toBeUndefined();
      done();
    });
  });

  test("validate with invalid body", done => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validate("post", "/echo");
    validate(baseReq, {}, err => {
      expect(err).toBeInstanceOf(ValidationError);
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
    validate(assoc(baseReq, "body", { value: 123 }), {}, err => {
      expect(err).toBeUndefined();
      done();
    });
  });

  test("validate with schema in internal ref fails with invalid body", done => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validate("post", "/test");
    validate(assoc(baseReq, "body", { value: "123" }), {}, err => {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err).toMatchSnapshot();
      done();
    });
  });

  test("creating schema with invalid parameter location throws", () => {
    const validator = new OpenApiValidator(openApiDocument);

    expect(() => {
      const op = validator.getOperationObject("get", "/parameters");
      const withInvalidParam = Object.assign({}, op, {
        parameters: [{ name: "invalid", in: "invalid" }, ...op.parameters],
      });
      validator.parameterObjectsToSchema(withInvalidParam);
    }).toThrowErrorMatchingSnapshot();
  });

  test("validating query with parameters schema succeeds", done => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validate("get", "/parameters");
    validate(
      assoc(baseReq, "query", { param: "123", porom: "abc" }),
      {},
      err => {
        expect(err).toBeUndefined();
        done();
      }
    );
  });

  test("validating query with parameters schema fails", done => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validate("get", "/parameters");
    validate(assoc(baseReq, "query", { porom: "abc" }), {}, err => {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err).toMatchSnapshot();
      done();
    });
  });

  test("validating headers with parameters schema succeeds", done => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validate("get", "/parameters/header");
    validate(assoc(baseReq, "headers", { "x-param": "let-in" }), {}, err => {
      expect(err).toBeUndefined();
      done();
    });
  });

  test("validating headers with parameters schema fails", done => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validate("get", "/parameters/header");
    validate(baseReq, {}, err => {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err).toMatchSnapshot();
      done();
    });
  });

  test("validating cookies with parameters schema succeeds", done => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validate("get", "/parameters/cookie");
    validate(assoc(baseReq, "cookies", { session: "abc123" }), {}, err => {
      expect(err).toBeUndefined();
      done();
    });
  });

  test("validating cookies with parameters schema fails", done => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validate("get", "/parameters/cookie");
    validate(baseReq, {}, err => {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err).toMatchSnapshot();
      done();
    });
  });

  test("validating cookies with parameters schema fails with no cookie parser", done => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validate("get", "/parameters/cookie");
    validate(assoc(baseReq, "cookies", undefined), {}, err => {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err).toMatchSnapshot();
      done();
    });
  });

  test("validating params with parameters schema succeeds", done => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validate("get", "/parameters/{id}");
    validate(assoc(baseReq, "params", { id: "123" }), {}, err => {
      expect(err).toBeUndefined();
      done();
    });
  });

  test("validating params with parameters schema fails", done => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validate("get", "/parameters/{id}");
    validate(baseReq, {}, err => {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err).toMatchSnapshot();
      done();
    });
  });
});
