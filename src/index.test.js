"use strict";

const index = require("./");
const OpenApiValidator = require("./OpenApiValidator");

test("index exports OpenApiValidator class", () => {
  expect(index).toBe(OpenApiValidator);
});
