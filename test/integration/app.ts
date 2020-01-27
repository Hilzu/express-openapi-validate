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

import cookieParser from "cookie-parser";
import express from "express";
import { OpenApiValidator } from "../../dist"; // eslint-disable-line
import openApiDocument from "../open-api-document";

const app: express.Express = express();
const validator = new OpenApiValidator(openApiDocument);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.post("/echo", validator.validate("post", "/echo"), (req, res, _next) => {
  res.json({ output: req.body.input });
});

app.post("/match/:optional?", validator.match(), (req, res, _next) => {
  res.json({ output: req.params.optional || req.body.input });
});

app.post("/no-match", validator.match(), (req, res, _next) => {
  res.json({ extra: req.body.anything });
});

app.get(
  "/parameters",
  validator.validate("get", "/parameters"),
  (req, res, _next) => {
    const { param, porom } = req.query;
    res.json({ param, porom });
  },
);

app.get(
  "/parameters/id/:id",
  validator.validate("get", "/parameters/id/{id}"),
  (req, res, _next) => {
    res.json({ id: Number(req.params.id) });
  },
);

app.get(
  "/parameters/header",
  validator.validate("get", "/parameters/header"),
  (req, res, _next) => {
    const header = req.get("X-Param");
    res.json({ header });
  },
);

app.get(
  "/parameters/cookie",
  validator.validate("get", "/parameters/cookie"),
  (req, res, _next) => {
    const cookie = req.cookies.session;
    res.json({ cookie });
  },
);

const errorHandler: express.ErrorRequestHandler = (err, req, res, _next) => {
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
