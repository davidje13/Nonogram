export class AmbiguousError extends Error {
  constructor(exampleStates) {
    super('game has multiple solutions');
    this.exampleStates = exampleStates;
  }
}

export class StuckError extends Error {
  constructor() {
    super('unable to solve game with configured methods');
  }
}

export class InvalidGameError extends Error {
  constructor(reason) {
    super(reason);
  }
}
