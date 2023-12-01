export class AmbiguousError extends Error {
  constructor(exampleBoards) {
    super('game has multiple solutions');
    this.exampleBoards = exampleBoards;
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
