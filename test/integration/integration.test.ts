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

import * as request from "supertest";
import app from "./app";

describe("Integration tests with real app", () => {
  test("requests against /echo are validated correctly", async () => {
    let res = await request(app)
      .post("/echo")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchSnapshot();

    res = await request(app)
      .post("/echo")
      .send({ input: "Hello!" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ output: "Hello!" });
  });
});
