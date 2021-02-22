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

const maxInt32 = 2 ** 31 - 1;
const minInt32 = (-2) ** 31;

const maxInt64 = 2 ** 63 - 1;
const minInt64 = (-2) ** 63;

const maxFloat = (2 - 2 ** -23) * 2 ** 127;
const minFloat = 2 ** -126;

const alwaysTrue = (): boolean => true;
const base64regExp = /^[A-Za-z0-9+/]*(=|==)?$/;

export const int32 = {
  validate: (i: number): boolean =>
    Number.isInteger(i) && i <= maxInt32 && i >= minInt32,
  type: "number",
};

export const int64 = {
  validate: (i: number): boolean =>
    Number.isInteger(i) && i <= maxInt64 && i >= minInt64,
  type: "number",
};

export const float = {
  validate: (i: number): boolean =>
    typeof i === "number" && i <= maxFloat && i >= minFloat,
  type: "number",
};

export const double = {
  validate: (i: number): boolean => typeof i === "number",
  type: "number",
};

export const byte = (b: string): boolean => {
  const { length } = b;
  if (length % 4 !== 0) {
    return false;
  }
  return base64regExp.test(b);
};

export const binary = alwaysTrue;

export const password = alwaysTrue;
