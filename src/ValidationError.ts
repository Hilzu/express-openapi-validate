import { ErrorObject } from "ajv";

export default class ValidationError extends Error {
  statusCode: number;
  data: Array<ErrorObject>;

  constructor(message: string, errors: Array<ErrorObject>) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 400;
    this.data = errors;
  }
}
