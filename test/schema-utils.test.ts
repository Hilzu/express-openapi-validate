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

import * as _ from "lodash";
import * as schemaUtils from "../src/schema-utils";
import openApiDocument from "./open-api-document";

describe("schema module", () => {
  test("walkSchema returns the same schema that was passed in with identity function as the mapper", () => {
    const schema = {
      properties: {
        foo: { type: "string" },
        bar: { type: "number", maximum: 3, exclusiveMinimum: 0 },
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

  test("resolveReference throws with unresolved $ref path", () => {
    expect(() => {
      schemaUtils.resolveReference(openApiDocument, {
        $ref: "#/components/schemas/Testt",
      });
    }).toThrowErrorMatchingSnapshot();
  });

  test("resolveReference throws with unsupported $ref", () => {
    expect(() => {
      schemaUtils.resolveReference(openApiDocument, { $ref: "#/a/b/C" });
    }).toThrowErrorMatchingSnapshot();
  });
});
