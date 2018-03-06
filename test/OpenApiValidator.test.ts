/*
  Copyright 2018 Santeri Hiltunen

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import OpenApiDocument, { Operation } from "../src/OpenApiDocument";
import OpenApiValidator, { ValidatorConfig } from "../src/OpenApiValidator";
import ValidationError from "../src/ValidationError";
import openApiDocument from "./open-api-document";

const baseReq: any = {
  body: {},
  query: {},
  headers: {},
  cookies: {},
  params: {},
};

const baseRes = { statusCode: 200, body: {}, headers: {} };

const createTestValidator = (
  document: OpenApiDocument,
  opts?: ValidatorConfig
) => {
  const validator = new OpenApiValidator(document, opts);
  return (method: Operation, path: string) => {
    const validate = validator.validate(method, path);
    return (userReq?: any) =>
      new Promise(resolve => {
        const req = { ...baseReq, ...userReq };
        validate(req, {} as any, resolve);
      });
  };
};

const getValidator = createTestValidator(openApiDocument);

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
      } as any);
    }).toThrowErrorMatchingSnapshot();
  });

  test("Ajv formats can be passed in", () => {
    const opts = { ajvOptions: { formats: { password: /[a-zA-Z0-9]{8,}/ } } };
    const validator = createTestValidator(openApiDocument, opts);
    const validate = validator("post", "/format");
    return validate({ body: { password: "abc" } })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ body: { password: "password123" } });
      })
      .then(err => {
        expect(err).toBeUndefined();
        return validate({ body: { d: 123.1 } });
      })
      .then(err => {
        expect(err).toBeUndefined();
      });
  });

  test("getting an operation object fails with invalid arguments", () => {
    const validator = new OpenApiValidator(openApiDocument);

    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const op = (validator as any)._getOperationObject("POST", "/echo");
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const op = (validator as any)._getOperationObject("ppost", "/echo");
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const op = (validator as any)._getOperationObject("post", "/echoo");
    }).toThrowErrorMatchingSnapshot();
  });

  test("getting an operation object succeeds", () => {
    const validator = new OpenApiValidator(openApiDocument);
    const op = (validator as any)._getOperationObject("post", "/echo");
    expect(op).toEqual(openApiDocument.paths["/echo"].post);
  });

  test("validating with a simple echo endpoint", async () => {
    const validate = getValidator("post", "/echo");
    let err = await validate({ body: { input: "hello" } });
    expect(err).toBeUndefined();

    err = await validate();
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();
  });

  test("validating response of echo endpoint", async () => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validateResponse("post", "/echo");
    expect(() => {
      validate(baseRes);
    }).toThrowErrorMatchingSnapshot();

    const err = validate({ ...baseRes, body: { output: "echo" } });
    expect(err).toBeUndefined();
  });

  test("validating with schema as an internal reference", async () => {
    const validate = getValidator("post", "/internal-ref");
    let err = await validate({ body: { value: 123 } });
    expect(err).toBeUndefined();

    err = await validate({ body: { value: "123" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();
  });

  test("creating schema with invalid parameter location throws", () => {
    const validator = new OpenApiValidator(openApiDocument);

    expect(() => {
      const op = (validator as any)._getOperationObject("get", "/parameters");
      const withInvalidParam = {
        ...op,
        parameters: [{ name: "invalid", in: "invalid" }, ...op.parameters],
      };
      (validator as any)._parameterObjectsToSchema(withInvalidParam);
    }).toThrowErrorMatchingSnapshot();
  });

  test("validating query with a parameter schema", async () => {
    const validate = getValidator("get", "/parameters");
    let err = await validate({ query: { param: "123", porom: "abc" } });
    expect(err).toBeUndefined();

    err = await validate({ query: { porom: "abc" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();
  });

  test("validating headers with a parameter schema", async () => {
    const validate = getValidator("get", "/parameters/header");
    let err = await validate({ headers: { "x-param": "let-in" } });
    expect(err).toBeUndefined();

    err = await validate();
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();
  });

  test("validating cookies with a parameter schema", async () => {
    const validate = getValidator("get", "/parameters/cookie");
    let err = await validate({ cookies: { session: "abc123" } });
    expect(err).toBeUndefined();

    err = await validate();
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();
  });

  test("validating cookies with parameters schema fails with no cookie parser", async () => {
    const validate = getValidator("get", "/parameters/cookie");
    const err = await validate({ cookies: undefined });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();
  });

  test("validating path parameters with a parameters schema", async () => {
    const validate = getValidator("get", "/parameters/id/{id}");
    let err = await validate({ params: { id: "123" } });
    expect(err).toBeUndefined();

    err = await validate();
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ params: { id: "abc" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();
  });

  test("validating bodies with null fields and nullable property is schema", async () => {
    const validate = getValidator("post", "/nullable");
    let err = await validate({ body: { bar: null } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ body: { baz: null } });
    expect(err).toBeUndefined();
  });

  test("validating query parameters with internal references", async () => {
    const validate = getValidator("get", "/ref-parameter");
    let err = await validate({ query: { hello: "hello" } });
    expect(err).toBeUndefined();

    err = await validate({ query: { hello: "" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();
  });

  test("validation with multiple different rules schema", async () => {
    const validate = getValidator("post", "/different-rules");
    let err = await validate({ query: {} });
    expect(err).toBeUndefined();

    err = await validate({ query: { q1: "abc1def" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ query: { q1: "abcdef" } });
    expect(err).toBeUndefined();

    err = await validate({ query: { q1: "ab" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ query: { q1: "abcabcabcdef" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ body: { i: 1.2 } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ body: { i: 256.0 } });
    expect(err).toBeUndefined();

    err = await validate({ body: { i: 111 } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();
  });

  test("validation with required body", async () => {
    const validate = getValidator("post", "/required-body");
    let err = await validate({ body: undefined });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ body: {} });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ body: { a: undefined } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ body: { a: "a" } });
    expect(err).toBeUndefined();
  });

  test("validation of numeric OpenAPI formats", async () => {
    const validate = getValidator("post", "/format");
    let err = await validate({ body: { i32: 2147483648 } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ body: { i32: "123" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ body: { i32: 123 } });
    expect(err).toBeUndefined();

    err = await validate({ body: { i64: "123" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ body: { i64: 123.1 } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ body: { i64: 123 } });
    expect(err).toBeUndefined();

    err = await validate({ body: { f: 123 } });
    expect(err).toBeUndefined();

    err = await validate({ body: { f: 123.1 } });
    expect(err).toBeUndefined();

    err = await validate({ body: { f: 3.4038234663852886e38 } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ body: { d: 3.4038234663852886e38 } });
    expect(err).toBeUndefined();

    err = await validate({ body: { d: null } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();
  });

  test("validation of OpenAPI string formats", async () => {
    const validate = getValidator("post", "/format");
    let err = await validate({ body: { byte: "" } });
    expect(err).toBeUndefined();

    err = await validate({ body: { byte: "aGVsbG8=" } });
    expect(err).toBeUndefined();

    err = await validate({ body: { byte: "aGVsbG8" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();
    const binary = Buffer.from([0x00, 0xff, 0x10, 0x88]).toString("binary");

    err = await validate({ body: { binary } });
    expect(err).toBeUndefined();

    err = await validate({ body: { password: "password" } });
    expect(err).toBeUndefined();

    err = await validate({ body: { date: "98-01-01" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ body: { date: "05/04/2014" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ body: { date: "2015-08-02" } });
    expect(err).toBeUndefined();
  });

  test("validating signed cookies generated by cookie-parser", async () => {
    const validate = getValidator("get", "/parameters/cookie");
    let err = await validate({ signedCookies: { session: "abc123" } });
    expect(err).toBeUndefined();

    err = await validate({ signedCookies: {} });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ signedCookies: { session: "" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({
      cookies: { session: "" },
      signedCookies: { session: "abc123" },
    });
    expect(err).toBeUndefined();
  });

  test("validating parameters with two required query parameters", async () => {
    const validate = getValidator("get", "/parameters/required");
    let err = await validate({ query: { q1: "a" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ query: { q2: "b" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ query: { q1: "c", q2: "d" } });
    expect(err).toBeUndefined();
  });

  test("response validation with different kinds of response objects", () => {
    const validator = new OpenApiValidator(openApiDocument);

    expect(() => {
      validator.validateResponse("post", "/echooo");
    }).toThrowErrorMatchingSnapshot();

    const validate = validator.validateResponse("post", "/responses");
    expect(() => {
      validate({});
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      (validate as any)();
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      validate({ stat: 200, body: {}, headers: {} });
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      validate({ status: 200, headers: {} });
    }).toThrowErrorMatchingSnapshot();

    expect(validate({ status: 200, data: {}, headers: {} })).toBeUndefined();
    expect(
      validate({ statusCode: 500, body: {}, headers: {} })
    ).toBeUndefined();

    const echoValidate = validator.validateResponse("post", "/echo");
    expect(
      echoValidate({ status: 200, data: { output: "hello" }, headers: {} })
    ).toBeUndefined();
    expect(
      echoValidate({ statusCode: 200, body: { output: "hello" }, headers: {} })
    ).toBeUndefined();
  });

  test("response validation with different status codes", () => {
    const validator = new OpenApiValidator(openApiDocument);
    let validate = validator.validateResponse("post", "/responses");

    expect(validate(baseRes)).toBeUndefined();

    expect(() => {
      validate({ ...baseRes, statusCode: 201 });
    }).toThrowErrorMatchingSnapshot();

    expect(
      validate({ ...baseRes, statusCode: 201, body: { hello: "hola" } })
    ).toBeUndefined();

    expect(validate({ ...baseRes, statusCode: 303 })).toBeUndefined();

    validate = validator.validateResponse("get", "/responses/no-default");
    expect(() => {
      validate({ ...baseReq, statusCode: 301 });
    }).toThrowErrorMatchingSnapshot();
  });

  test("validating response headers", () => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validateResponse("post", "/responses/header");

    expect(() => {
      validate(baseRes);
    }).toThrowErrorMatchingSnapshot();

    expect(
      validate({ ...baseRes, headers: { "x-header": "heh" } })
    ).toBeUndefined();

    expect(() => {
      validate({
        ...baseRes,
        headers: { "x-header": "heh", "x-ref-header": "as" },
      });
    }).toThrowErrorMatchingSnapshot();

    expect(
      validate({
        ...baseRes,
        headers: { "x-header": "heh", "x-ref-header": "asa" },
      })
    ).toBeUndefined();
  });

  test("validating response headers with several required headers", () => {
    const validator = new OpenApiValidator(openApiDocument);
    const validate = validator.validateResponse("post", "/responses/header2");

    expect(() => {
      validate(baseRes);
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      validate({ ...baseRes, headers: { "x-1": "a" } });
    }).toThrowErrorMatchingSnapshot();

    expect(
      validate({ ...baseRes, headers: { "x-1": "a", "x-2": "b" } })
    ).toBeUndefined();
  });

  test("schemas with several references", async () => {
    const validate = getValidator("post", "/schema-references");

    let err = await validate({ body: { value: "1" } });
    expect(err).toBeUndefined();

    err = await validate({});
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ body: { value: "1", tag: "" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ body: { value: "1", tag: "abc" } });
    expect(err).toBeUndefined();
  });

  test("schemas with request body and headers references", async () => {
    const validate = getValidator("post", "/more-references");

    let err = await validate({ body: { ping: "asd" } });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchSnapshot();

    err = await validate({ body: { ping: "pong" } });
    expect(err).toBeUndefined();

    const validator = new OpenApiValidator(openApiDocument);
    const validateResponse = validator.validateResponse(
      "post",
      "/more-references"
    );
    expect(() => {
      validateResponse({ ...baseRes, headers: { "x-hullo": "a" } });
    }).toThrowErrorMatchingSnapshot();

    expect(
      validateResponse({ ...baseRes, headers: { "x-hullo": "aa" } })
    ).toBeUndefined();
  });
});
