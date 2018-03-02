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

export const assoc = <T, U extends object, K extends string>(
  obj: U,
  property: K,
  value: T
): Record<K, T> & U =>
  // tslint:disable-next-line:prefer-object-spread
  Object.assign({}, obj, { [property]: value }) as Record<K, T> & U;

export const dissoc = <T>(obj: any, prop: string): T => {
  const result = { ...obj };
  delete result[prop];
  return result;
};
