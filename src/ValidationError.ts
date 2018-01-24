import { ErrorObject } from "ajv";

export default class ValidationError extends Error {
  public statusCode: number;
  public data: ErrorObject[];

  constructor(message: string, errors: ErrorObject[]) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 400;
    this.data = errors;
  }
}
