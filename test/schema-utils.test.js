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

const _ = require("lodash");
const schemaUtils = require("../dist/schema-utils");

describe("schema module", () => {
  test("walkSchema returns the same schema that was passed in with identity function as the mapper", () => {
    const schema = {
      properties: {
        foo: { type: "string" },
        bar: { type: ["number", "null"], maximum: 3, exclusiveMinimum: 0 },
        version: {
          type: "string",
          const: "v1",
        },
        baz: {
          type: "object",
          properties: {
            asd: {
              type: "array",
              items: {
                type: "string",
              },
              minItems: 1,
              uniqueItems: false,
              maxItems: 100,
            },
          },
        },
      },
    };
    expect(schemaUtils.walkSchema(schema, _.identity)).toEqual(schema);
  });

  test("maps OAS nullable field to correct type array", () => {
    const schema = {
      properties: {
        foo: {
          nullable: true,
          type: "number",
        },
        bar: {
          type: "array",
          items: {
            type: "string",
            nullable: true,
          },
        },
        baz: {
          type: "string",
          nullable: false,
        },
      },
    };
    expect(schemaUtils.mapOasSchemaToJsonSchema(schema)).toEqual({
      properties: {
        foo: {
          type: ["number", "null"],
        },
        bar: {
          type: "array",
          items: {
            type: ["string", "null"],
          },
        },
        baz: {
          type: "string",
        },
      },
    });
  });
});
