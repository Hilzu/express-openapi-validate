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

import * as express from "express";
import { OpenApiValidator } from "../../dist";
import openApiDocument from "../open-api-document";

const app: express.Express = express();
const validator = new OpenApiValidator(openApiDocument);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/echo", validator.validate("post", "/echo"), (req, res, next) => {
  res.json({ output: req.body.input });
});

const errorHandler: express.ErrorRequestHandler = (err, req, res, next) => {
  res.status(err.statusCode).json({
    error: {
      name: err.name,
      message: err.message,
      data: err.data,
    },
  });
};

app.use(errorHandler);

export default app;
