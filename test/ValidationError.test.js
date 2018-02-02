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
