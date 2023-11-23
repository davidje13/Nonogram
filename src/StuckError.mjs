export class StuckError extends Error {
  constructor() {
    super('unable to solve game with configured methods');
  }
}
