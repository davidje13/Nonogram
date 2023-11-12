export class AmbiguousError extends Error {
  constructor(exampleStates) {
    super('game has multiple solutions');
    this.exampleStates = exampleStates;
  }
}
