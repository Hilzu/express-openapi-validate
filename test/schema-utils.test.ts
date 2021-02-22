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

import _ from "lodash";
import {
  mapOasSchemaToJsonSchema,
  resolveReference,
  walkSchema,
  oasPathToExpressPath,
} from "../src/schema-utils";
import openApiDocument from "./open-api-document";

describe("schema utils module", () => {
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
          nullable: true,
        },
      },
    };
    expect(walkSchema(schema, _.identity)).toEqual(schema);
  });

  test("map schema throws with invalid OAS schemas", () => {
    expect(() => {
      mapOasSchemaToJsonSchema({ type: ["array", "null"] as any }, {} as any);
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      mapOasSchemaToJsonSchema(
        {
          items: [{ type: "string" }, { type: "number" }] as any,
        },
        {} as any,
      );
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      mapOasSchemaToJsonSchema(
        {
          oneOf: [{ type: "string" }, { type: ["number", "null"] } as any],
        },
        {} as any,
      );
    }).toThrowErrorMatchingSnapshot();
  });

  test("resolveReference throws with unresolved $ref path", () => {
    expect(() => {
      resolveReference(openApiDocument, {
        $ref: "#/components/schemas/Testt",
      });
    }).toThrowErrorMatchingSnapshot();
  });

  test("resolveReference throws with unsupported $ref", () => {
    expect(() => {
      resolveReference(openApiDocument, { $ref: "#/a/b/C" });
    }).toThrowErrorMatchingSnapshot();
  });

  test("oasPathToExpressPath formats URL parameters for path-to-regexp", () => {
    expect(oasPathToExpressPath("/foo")).toEqual("/foo");
    expect(oasPathToExpressPath("/foo/{param}")).toEqual("/foo/:param");
    expect(oasPathToExpressPath("/foo/{param}/bar")).toEqual("/foo/:param/bar");
  });
});
