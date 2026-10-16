(() => {
  const DISHES = ["🍽️", "🥣", "☕", "🍵", "🍶", "🥛", "🍜", "🍚", "🍴", "🫖"];

  class DishDashGame {
    constructor({ board, onUpdate, onRoundEnd, onStrike, onSave }) {
      this.board = board;
      this.onUpdate = onUpdate;
      this.onRoundEnd = onRoundEnd;
      this.onStrike = onStrike;
      this.onSave = onSave;
      this.round = 1;
      this.score = 0;
      this.strikes = 0;
      this.timeLeft = 30;
      this.running = false;
      this.paused = false;
      this.dishes = new Map();
      this.lastFrame = 0;
      this.spawnElapsed = 0;
      this.animationFrame = null;
      this.boundFrame = (timestamp) => this.frame(timestamp);
    }

    startRound(round = this.round) {
      this.stop();
      this.round = Math.max(1, Math.min(30, round));
      this.score = 0;
      this.strikes = 0;
      this.timeLeft = 30;
      this.spawnElapsed = 0;
      this.lastFrame = 0;
      this.running = true;
      this.paused = false;
      this.clearBoard();
      this.onUpdate(this.snapshot());
      this.animationFrame = requestAnimationFrame(this.boundFrame);
    }

    snapshot() {
      return { round: this.round, score: this.score, strikes: this.strikes, timeLeft: this.timeLeft };
    }

    frame(timestamp) {
      if (!this.running || this.paused) return;
      if (!this.lastFrame) this.lastFrame = timestamp;
      const delta = Math.min((timestamp - this.lastFrame) / 1000, 0.1);
      this.lastFrame = timestamp;
      this.timeLeft = Math.max(0, this.timeLeft - delta);
      this.spawnElapsed += delta;
      const spawnInterval = Math.max(0.36, 1.3 - (this.round - 1) * 0.028);

      if (this.spawnElapsed >= spawnInterval) {
        this.spawnElapsed = 0;
        this.spawnDish();
      }
      this.updateFallingDishes(delta);
      this.onUpdate(this.snapshot());

      if (!this.running) return;
      if (this.strikes >= 3) {
        this.endRound(false, true);
        return;
      }
      if (this.timeLeft <= 0) {
        this.endRound(true, false);
        return;
      }
      this.animationFrame = requestAnimationFrame(this.boundFrame);
    }

    spawnDish() {
      const dish = document.createElement("button");
      const id = `${Date.now()}-${Math.random()}`;
      const boardWidth = this.board.clientWidth;
      const boardHeight = this.board.clientHeight;
      const size = 64;
      const x = size / 2 + Math.random() * Math.max(1, boardWidth - size);
      const y = 80 + Math.random() * Math.min(75, Math.max(20, boardHeight * 0.16));
      const symbol = DISHES[Math.floor(Math.random() * DISHES.length)];
      const speed = 62 + this.round * 7 + Math.random() * 32;

      dish.type = "button";
      dish.className = "dish";
      dish.textContent = symbol;
      dish.setAttribute("aria-label", `Save falling dish ${symbol}`);
      dish.style.left = `${x}px`;
      dish.style.top = `${y}px`;
      dish.addEventListener("click", () => this.saveDish(id, dish));
      this.board.append(dish);
      this.dishes.set(id, { element: dish, x, y, speed, missed: false });
    }

    updateFallingDishes(delta) {
      const floorY = this.board.clientHeight - 23;
      for (const [id, dish] of this.dishes) {
        if (dish.missed) continue;
        dish.y += dish.speed * delta;
        dish.element.style.top = `${dish.y}px`;
        if (dish.y >= floorY) this.missDish(id, dish);
      }
    }

    saveDish(id, dish) {
      const item = this.dishes.get(id);
      if (!item || item.missed || !this.running || this.paused) return;
      item.missed = true;
      this.score += 1;
      dish.classList.add("is-saved");
      this.showFloatLabel(item.x, item.y, "+1");
      window.DishDashAudio.save();
      this.onSave(this.snapshot());
      this.onUpdate(this.snapshot());
      window.setTimeout(() => this.removeDish(id), 330);
    }

    missDish(id, item) {
      if (item.missed) return;
      item.missed = true;
      this.strikes += 1;
      item.element.classList.add("is-broken");
      this.showFloatLabel(item.x, this.board.clientHeight - 39, "CRASH!", true);
      window.DishDashAudio.break();
      this.onStrike(this.snapshot());
      this.onUpdate(this.snapshot());
      window.setTimeout(() => this.removeDish(id), 360);
    }

    showFloatLabel(x, y, text, isStrike = false) {
      const label = document.createElement("span");
      label.className = `float-label${isStrike ? " strike-label" : ""}`;
      label.textContent = text;
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
      this.board.append(label);
      window.setTimeout(() => label.remove(), 850);
    }

    removeDish(id) {
      this.dishes.get(id)?.element.remove();
      this.dishes.delete(id);
    }

    pause() {
      if (!this.running) return;
      this.paused = !this.paused;
      if (this.paused) {
        cancelAnimationFrame(this.animationFrame);
      } else {
        this.lastFrame = 0;
        this.animationFrame = requestAnimationFrame(this.boundFrame);
      }
      return this.paused;
    }

    endRound(completed, gameOver) {
      if (!this.running) return;
      this.running = false;
      cancelAnimationFrame(this.animationFrame);
      this.onRoundEnd({ ...this.snapshot(), completed, gameOver, stars: Math.max(0, 3 - this.strikes) });
    }

    stop() {
      this.running = false;
      this.paused = false;
      cancelAnimationFrame(this.animationFrame);
      this.clearBoard();
    }

    clearBoard() {
      this.dishes.clear();
      this.board.querySelectorAll(".dish, .float-label, .paused-screen").forEach((element) => element.remove());
    }
  }

  window.DishDashGame = DishDashGame;
})();
