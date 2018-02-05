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

const createTestValidator = document => {
  const validator = new OpenApiValidator(document);
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
});
