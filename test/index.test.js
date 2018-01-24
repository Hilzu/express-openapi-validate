"use strict";

const index = require("../dist");
const OpenApiValidator = require("../dist/OpenApiValidator").default;

test("index exports OpenApiValidator class", () => {
  expect(index).toBe(OpenApiValidator);
});
