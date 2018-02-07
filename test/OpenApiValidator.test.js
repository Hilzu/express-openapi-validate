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

"use strict";

const OpenApiValidator = require("../dist/OpenApiValidator").default;
const ValidationError = require("../dist/ValidationError").default;
const openApiDocument = require("./open-api-document");

const baseReq = { body: {}, query: {}, headers: {}, cookies: {}, params: {} };

const createTestValidator = (...args) => {
  const validator = new OpenApiValidator(...args);
  return (method, path) => {
    const validate = validator.validate(method, path);
    return userReq =>
      new Promise(resolve => {
        const req = Object.assign({}, baseReq, userReq);
        validate(req, {}, resolve);
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
      });
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
      const op = validator._getOperationObject("POST", "/echo");
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const op = validator._getOperationObject("ppost", "/echo");
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const op = validator._getOperationObject("post", "/echoo");
    }).toThrowErrorMatchingSnapshot();
  });

  test("getting an operation object succeeds", () => {
    const validator = new OpenApiValidator(openApiDocument);
    const op = validator._getOperationObject("post", "/echo");
    expect(op).toEqual(openApiDocument.paths["/echo"].post);
  });

  test("validate", () => {
    const validate = getValidator("post", "/echo");
    return validate({ body: { input: "hello" } }).then(err => {
      expect(err).toBeUndefined();
    });
  });

  test("validate with invalid body", () => {
    const validate = getValidator("post", "/echo");
    return validate().then(err => {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err).toMatchSnapshot();
    });
  });

  test("validate with schema in internal ref", () => {
    const validate = getValidator("post", "/test");
    return validate({ body: { value: 123 } }).then(err => {
      expect(err).toBeUndefined();
    });
  });

  test("validate with schema in internal ref fails with invalid body", () => {
    const validate = getValidator("post", "/test");
    return validate({ body: { value: "123" } }).then(err => {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err).toMatchSnapshot();
    });
  });

  test("creating schema with invalid parameter location throws", () => {
    const validator = new OpenApiValidator(openApiDocument);

    expect(() => {
      const op = validator._getOperationObject("get", "/parameters");
      const withInvalidParam = Object.assign({}, op, {
        parameters: [{ name: "invalid", in: "invalid" }, ...op.parameters],
      });
      validator._parameterObjectsToSchema(withInvalidParam);
    }).toThrowErrorMatchingSnapshot();
  });

  test("validating query with parameters schema succeeds", () => {
    const validate = getValidator("get", "/parameters");
    return validate({ query: { param: "123", porom: "abc" } }).then(err => {
      expect(err).toBeUndefined();
    });
  });

  test("validating query with parameters schema fails", () => {
    const validate = getValidator("get", "/parameters");
    return validate({ query: { porom: "abc" } }).then(err => {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err).toMatchSnapshot();
    });
  });

  test("validating headers with parameters schema succeeds", () => {
    const validate = getValidator("get", "/parameters/header");
    return validate({ headers: { "x-param": "let-in" } }).then(err => {
      expect(err).toBeUndefined();
    });
  });

  test("validating headers with parameters schema fails", () => {
    const validate = getValidator("get", "/parameters/header");
    return validate().then(err => {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err).toMatchSnapshot();
    });
  });

  test("validating cookies with parameters schema succeeds", () => {
    const validate = getValidator("get", "/parameters/cookie");
    return validate({ cookies: { session: "abc123" } }).then(err => {
      expect(err).toBeUndefined();
    });
  });

  test("validating cookies with parameters schema fails", () => {
    const validate = getValidator("get", "/parameters/cookie");
    return validate().then(err => {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err).toMatchSnapshot();
    });
  });

  test("validating cookies with parameters schema fails with no cookie parser", () => {
    const validate = getValidator("get", "/parameters/cookie");
    return validate({ cookies: undefined }).then(err => {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err).toMatchSnapshot();
    });
  });

  test("validating params with parameters schema succeeds", () => {
    const validate = getValidator("get", "/parameters/{id}");
    return validate({ params: { id: "123" } }).then(err => {
      expect(err).toBeUndefined();
    });
  });

  test("validating params with parameters schema fails", () => {
    const validate = getValidator("get", "/parameters/{id}");
    return validate().then(err => {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err).toMatchSnapshot();
    });
  });

  test("validation fails with null field in body", () => {
    const validate = getValidator("post", "/nullable");
    return validate({ body: { bar: null } }).then(err => {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err).toMatchSnapshot();
    });
  });

  test("validation passes with null field in body that has nullable set", () => {
    const validate = getValidator("post", "/nullable");
    return validate({ body: { baz: null } }).then(err => {
      expect(err).toBeUndefined();
    });
  });

  test("validation with reference parameter succeeds with correct data", () => {
    const validate = getValidator("get", "/ref-parameter");
    return validate({ query: { hello: "hello" } }).then(err => {
      expect(err).toBeUndefined();
    });
  });

  test("validation with reference parameter fails with invalid data", () => {
    const validate = getValidator("get", "/ref-parameter");
    return validate({ query: { hello: "" } }).then(err => {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err).toMatchSnapshot();
    });
  });

  test("validation with multiple different rules schema", () => {
    const validate = getValidator("post", "/different-rules");
    return validate({ query: {} })
      .then(err => {
        expect(err).toBeUndefined();
        return validate({ query: { q1: "abc1def" } });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ query: { q1: "abcdef" } });
      })
      .then(err => {
        expect(err).toBeUndefined();
        return validate({ query: { q1: "ab" } });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ query: { q1: "abcabcabcdef" } });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ body: { i: 1.2 } });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ body: { i: 256.0 } });
      })
      .then(err => {
        expect(err).toBeUndefined();
        return validate({ body: { i: 111 } });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
      });
  });

  test("validation with required body", () => {
    const validate = getValidator("post", "/required-body");
    return validate({ body: undefined })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ body: {} });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ body: { a: undefined } });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ body: { a: "a" } });
      })
      .then(err => {
        expect(err).toBeUndefined();
      });
  });

  test("validation of numeric OpenAPI formats", () => {
    const validate = getValidator("post", "/format");
    return validate({ body: { i32: 2147483648 } })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ body: { i32: "123" } });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ body: { i32: 123 } });
      })
      .then(err => {
        expect(err).toBeUndefined();
        return validate({ body: { i64: "123" } });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ body: { i64: 123.1 } });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ body: { i64: 123 } });
      })
      .then(err => {
        expect(err).toBeUndefined();
        return validate({ body: { f: 123 } });
      })
      .then(err => {
        expect(err).toBeUndefined();
        return validate({ body: { f: 123.1 } });
      })
      .then(err => {
        expect(err).toBeUndefined();
        return validate({ body: { f: 3.4038234663852886e38 } });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ body: { d: 3.4038234663852886e38 } });
      })
      .then(err => {
        expect(err).toBeUndefined();
        return validate({ body: { d: null } });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
      });
  });

  test("validation of OpenAPI string formats", () => {
    const validate = getValidator("post", "/format");
    return validate({ body: { byte: "" } })
      .then(err => {
        expect(err).toBeUndefined();
        return validate({ body: { byte: "aGVsbG8=" } });
      })
      .then(err => {
        expect(err).toBeUndefined();
        return validate({ body: { byte: "aGVsbG8" } });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        const binary = Buffer.from([0x00, 0xff, 0x10, 0x88]).toString("binary");
        return validate({ body: { binary } });
      })
      .then(err => {
        expect(err).toBeUndefined();
        return validate({ body: { password: "password" } });
      })
      .then(err => {
        expect(err).toBeUndefined();
        return validate({ body: { date: "98-01-01" } });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ body: { date: "05/04/2014" } });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ body: { date: "2015-08-02" } });
      })
      .then(err => {
        expect(err).toBeUndefined();
      });
  });

  test("validating signed cookies generated by cookie-parser", () => {
    const validate = getValidator("get", "/parameters/cookie");
    return validate({ signedCookies: { session: "abc123" } })
      .then(err => {
        expect(err).toBeUndefined();
        return validate({ signedCookies: {} });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ signedCookies: { session: "" } });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({
          cookies: { session: "" },
          signedCookies: { session: "abc123" },
        });
      })
      .then(err => {
        expect(err).toBeUndefined();
      });
  });

  test("validating parameters with two required query parameters", () => {
    const validate = getValidator("get", "/parameters/required");
    return validate({ query: { q1: "a" } })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ query: { q2: "b" } });
      })
      .then(err => {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err).toMatchSnapshot();
        return validate({ query: { q1: "c", q2: "d" } });
      })
      .then(err => {
        expect(err).toBeUndefined();
      });
  });
});
