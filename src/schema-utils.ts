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
import { assoc } from "./object-utils";
import { SchemaObject } from "./OpenApiDocument";

type Schema = SchemaObject;

export const walkSchema = (
  originalSchema: Schema,
  mapper: (x: Schema) => Schema
): Schema => {
  const schema = mapper(originalSchema);
  if (schema.items) {
    return assoc(schema, "items", walkSchema(schema.items, mapper));
  } else if (schema.type === "object" || schema.properties) {
    return assoc(
      schema,
      "properties",
      _.mapValues(schema.properties, (x: Schema) => walkSchema(x, mapper))
    );
  }
  return schema;
};

export const mapOasSchemaToJsonSchema = (originalSchema: Schema) => {
  const mapOasFieldsToJsonSchemaFields = (s: Schema) => {
    let schema = s;
    if (schema.nullable !== undefined) {
      if (schema.nullable) {
        schema = assoc(schema, "type", [schema.type, "null"]);
      }
      schema = assoc(schema, "nullable", undefined);
    }
    return schema;
  };
  return walkSchema(originalSchema, mapOasFieldsToJsonSchemaFields);
};
