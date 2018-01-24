"use strict";

const ValidationError = require("../dist/ValidationError").default;

test("ValidationError can be created and has correct fields", () => {
  const e = new ValidationError("msg", [1, 2, 3]);
  expect(e).toBeInstanceOf(Error);
  expect(e).toBeInstanceOf(ValidationError);
  expect(e.message).toBe("msg");
  expect(e.name).toBe("ValidationError");
  expect(e.data).toEqual([1, 2, 3]);
  expect(e.stack).toBeDefined();
});
