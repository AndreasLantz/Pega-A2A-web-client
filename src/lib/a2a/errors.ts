export class A2AError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message);
    this.name = "A2AError";
  }
}
