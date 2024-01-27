export class Judge {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.difficulty = 0;
    this.tedium = 0;
    this.steps = 0;
  }

  accumulate(step) {
    if (step?.hint) {
      const difficulty = step.hint.difficulty ?? 1;
      const tedium = step.hint.tedium ?? 1;
      if (!checkNumber(difficulty) || !checkNumber(tedium)) {
        throw new Error(`Invalid difficulty/tedium for step: ${JSON.stringify(step)}`);
      }
      this.difficulty += difficulty;
      this.tedium += tedium;
      ++this.steps;
    }
  }

  predictedSteps() {
    // found experimentally
    return Math.pow(this.w * this.h, 0.85) * 0.5;
  }

  averageStepDifficulty() {
    return this.difficulty / this.steps;
  }

  averageStepTedium() {
    return this.tedium / this.steps;
  }

  expectedSteps() {
    const n = this.w + this.h;
    return n * Math.log(n);
  }
}

function checkNumber(n) {
  return typeof n === 'number' && !Number.isNaN(n) && Number.isFinite(n);
}
