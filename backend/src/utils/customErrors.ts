// Define Error with statusCode
export class HttpError extends Error {
  statusCode: number;
  constructor(message: string = "Internal Server Error", statusCode: number) {
    super(message);
    // Add statusCode
    this.statusCode = statusCode;
  }
}
