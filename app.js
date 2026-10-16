(() => {
  const $ = (selector) => document.querySelector(selector);
  const menuScreen = $("#menu-screen");
  const gameScreen = $("#game-screen");
  const board = $("#game-board");
  const backdrop = $("#modal-backdrop");
  const modalIcon = $("#modal-icon");
  const modalEyebrow = $("#modal-eyebrow");
  const modalTitle = $("#modal-title");
  const modalBody = $("#modal-body");
  const modalActions = $("#modal-actions");
  const modalClose = $("#modal-close");
  let game;
  let soundEnabled = window.DishDashAudio.enabled;
  let activeModal = null;

  const getBest = () => Number(localStorage.getItem("dishDashBestLevel") || 1);
  const getUnlockedLevel = () => {
    const savedUnlock = localStorage.getItem("dishDashUnlockedLevel");
    const previousBest = localStorage.getItem("dishDashBestLevel");
    const level = savedUnlock === null
      ? Number(previousBest || 1) + (previousBest === null ? 0 : 1)
      : Number(savedUnlock);
    return Number.isFinite(level) ? Math.max(1, Math.min(30, level)) : 1;
  };
  const getLevelStars = () => {
    const stored = localStorage.getItem("dishDashLevelStars");
    if (stored === null) return {};
    const stars = JSON.parse(stored);
    return stars && typeof stars === "object" && !Array.isArray(stars) ? stars : {};
  };
  const getBestStars = (level, levelStars = getLevelStars()) => Math.max(0, Math.min(3, Number(levelStars[level]) || 0));
  const getTotalStars = () => {
    const levelStars = getLevelStars();
    return Array.from({ length: 30 }, (_, index) => getBestStars(index + 1, levelStars)).reduce((total, stars) => total + stars, 0);
  };
  const getTotalDishesSaved = () => {
    const total = Number(localStorage.getItem("dishDashTotalDishesSaved") || 0);
    return Number.isSafeInteger(total) && total > 0 ? total : 0;
  };

  function updateBest() {
    $("#menu-best").textContent = `Level ${getBest()}`;
  }

  function updateCareerStats() {
    $("#menu-stars").textContent = getTotalStars();
    $("#menu-dishes-saved").textContent = getTotalDishesSaved().toLocaleString();
  }

  function recordDishSaved() {
    const total = getTotalDishesSaved() + 1;
    localStorage.setItem("dishDashTotalDishesSaved", String(total));
    updateCareerStats();
  }

  function showScreen(screen) {
    menuScreen.classList.toggle("is-active", screen === "menu");
    gameScreen.classList.toggle("is-active", screen === "game");
  }

  function updateHud(state) {
    $("#level-value").textContent = state.round;
    $("#round-footer").textContent = state.round;
    $("#timer-value").textContent = Math.ceil(state.timeLeft);
    $("#score-value").textContent = state.score;
    $("#strike-value").innerHTML = `${state.strikes}<span class="strike-divider">/</span>3`;
    const progress = Math.max(0, Math.min(100, (state.timeLeft / 30) * 100));
    $("#timer-bar").style.width = `${progress}%`;
    $("#timer-bar").classList.toggle("is-low", state.timeLeft <= 8);
  }

  function setPauseButton(paused) {
    $("#pause-button").textContent = paused ? "▶" : "Ⅱ";
    $("#pause-button").setAttribute("aria-label", paused ? "Resume game" : "Pause game");
  }

  function button(label, action, secondary = false) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = `button ${secondary ? "button-secondary" : "button-primary"}`;
    element.textContent = label;
    element.addEventListener("click", action);
    return element;
  }

  function openModal({ icon = "✨", eyebrow = "A LITTLE TIP", title, body, actions = [], closeAction = null }) {
    activeModal = { icon, eyebrow, title, body, actions, closeAction };
    modalIcon.textContent = icon;
    modalEyebrow.textContent = eyebrow;
    modalTitle.textContent = title;
    modalBody.replaceChildren();
    modalActions.replaceChildren();
    if (typeof body === "string") {
      modalBody.textContent = body;
    } else if (body) {
      modalBody.append(body);
    }
    actions.forEach(({ label, action, secondary }) => modalActions.append(button(label, action, secondary)));
    backdrop.hidden = false;
    modalClose.hidden = !closeAction;
    const firstAction = modalActions.querySelector("button");
    (firstAction || modalClose).focus();
  }

  function closeModal() {
    if (backdrop.hidden) return;
    backdrop.hidden = true;
    if (activeModal?.closeAction) activeModal.closeAction();
    activeModal = null;
  }

  function makeHowToPlay() {
    const content = document.createElement("div");
    const intro = document.createElement("p");
    intro.textContent = "Keep every dish off the floor and become the kitchen's fastest hands.";
    content.append(intro);
    const list = document.createElement("div");
    list.className = "tip-list";
    [
      ["👆", "Tap a falling dish to save it and score a point."],
      ["⏱️", "Stay in the game for 30 seconds to clear the round."],
      ["💔", "Three broken dishes end your run. New rounds get quicker!"],
      ["⭐", "Clear a round to earn a star for each strike you avoided."],
      ["⌨️", "Press P to pause or resume; choose Main menu while paused to leave."]
    ].forEach(([icon, text]) => {
      const row = document.createElement("div");
      row.className = "tip-row";
      const symbol = document.createElement("span");
      symbol.textContent = icon;
      const description = document.createElement("span");
      description.textContent = text;
      row.append(symbol, description);
      list.append(row);
    });
    content.append(list);
    return content;
  }

  function makeLevelSelect() {
    const content = document.createElement("div");
    const intro = document.createElement("p");
    intro.textContent = `Choose a level to play. Clear a level to unlock the next one. Levels unlocked: ${getUnlockedLevel()} of 30.`;
    content.append(intro);

    const grid = document.createElement("div");
    grid.className = "level-grid";
    const unlockedLevel = getUnlockedLevel();
    const levelStars = getLevelStars();
    for (let level = 1; level <= 30; level += 1) {
      const levelButton = document.createElement("button");
      const isUnlocked = level <= unlockedLevel;
      const bestStars = getBestStars(level, levelStars);
      const isCompleted = bestStars > 0;
      levelButton.type = "button";
      levelButton.className = `level-button${isUnlocked ? " is-unlocked" : " is-locked"}${isCompleted ? " is-completed" : ""}`;
      levelButton.disabled = !isUnlocked;
      levelButton.setAttribute("aria-label", isUnlocked
        ? `Play level ${level}${isCompleted ? `, best attempt: ${bestStars} out of 3 stars` : ", not completed yet"}`
        : `Level ${level} locked`);
      levelButton.title = isUnlocked
        ? isCompleted ? `Best attempt: ${bestStars} out of 3 stars` : "Not completed yet"
        : "Clear the previous level to unlock";
      const number = document.createElement("span");
      number.textContent = String(level);
      levelButton.append(number);
      if (isCompleted) {
        const rating = document.createElement("span");
        rating.className = "level-stars";
        rating.setAttribute("aria-hidden", "true");
        for (let star = 1; star <= 3; star += 1) {
          const starMark = document.createElement("span");
          starMark.className = star <= bestStars ? "earned" : "empty";
          starMark.textContent = "★";
          rating.append(starMark);
        }
        levelButton.append(rating);
      } else {
        const icon = document.createElement("span");
        icon.className = "level-indicator";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = isUnlocked ? "▶" : "🔒";
        levelButton.append(icon);
      }
      if (isUnlocked) levelButton.addEventListener("click", () => startGame(level));
      grid.append(levelButton);
    }
    content.append(grid);
    return content;
  }

  function openLevelSelect() {
    openModal({
      icon: "🗺️",
      eyebrow: "PICK YOUR CHALLENGE",
      title: "Choose a level",
      body: makeLevelSelect(),
      closeAction: () => {},
      actions: [{ label: "Back", secondary: true, action: closeModal }]
    });
  }

  function startGame(round = 1) {
    closeModal();
    showScreen("game");
    setPauseButton(false);
    game.startRound(round);
    window.DishDashAudio.start();
  }

  function startNextRound(round) {
    if (round > 30) {
      openModal({
        icon: "🏆",
        eyebrow: "KITCHEN LEGEND",
        title: "You did it!",
        body: "You conquered all 30 levels! Every dish is safe and sound.",
        actions: [
          { label: "Play again", action: () => startGame(1) },
          { label: "Main menu", secondary: true, action: returnToMenu }
        ]
      });
      return;
    }
    startGame(round);
  }

  function renderRoundResult(result) {
    const stars = document.createElement("div");
    stars.className = "round-stars";
    stars.setAttribute("aria-label", `${result.stars} out of 3 stars`);
    stars.textContent = "★".repeat(result.stars);
    if (result.stars < 3) {
      const empty = document.createElement("span");
      empty.className = "empty";
      empty.textContent = "★".repeat(3 - result.stars);
      stars.append(empty);
    }

    if (result.completed) {
      const nextUnlockedLevel = Math.min(30, result.round + 1);
      localStorage.setItem("dishDashUnlockedLevel", String(Math.max(getUnlockedLevel(), nextUnlockedLevel)));
      const levelStars = getLevelStars();
      const bestStars = Math.max(Number(levelStars[result.round]) || 0, result.stars);
      levelStars[result.round] = bestStars;
      localStorage.setItem("dishDashLevelStars", JSON.stringify(levelStars));
      updateCareerStats();
      const isNewBest = result.round > getBest();
      if (isNewBest) {
        localStorage.setItem("dishDashBestLevel", String(result.round));
        updateBest();
      }
      const body = document.createElement("div");
      body.append(stars);
      const summary = document.createElement("p");
      summary.textContent = `You saved ${result.score} ${result.score === 1 ? "dish" : "dishes"} and made it through level ${result.round}!`;
      body.append(summary);
      if (isNewBest) {
        const badge = document.createElement("span");
        badge.className = "new-best";
        badge.textContent = "NEW PERSONAL BEST!";
        body.append(badge);
      }
      openModal({
        icon: "🎉",
        eyebrow: "ROUND COMPLETE",
        title: result.round === 30 ? "You're a legend!" : "Nice saving!",
        body,
        actions: result.round === 30
          ? [
              { label: "Play again", action: () => startGame(1) },
              { label: "Main menu", secondary: true, action: returnToMenu }
            ]
          : [
              { label: "Next level →", action: () => startNextRound(result.round + 1) },
              { label: "Replay level", secondary: true, action: () => startGame(result.round) },
              { label: "Main menu", secondary: true, action: returnToMenu }
            ]
      });
      return;
    }

    const body = document.createElement("div");
    body.append(stars);
    const summary = document.createElement("p");
    summary.textContent = `You saved ${result.score} ${result.score === 1 ? "dish" : "dishes"} in level ${result.round}. Those dishes had a close call!`;
    body.append(summary);
    openModal({
      icon: "💥",
      eyebrow: "THREE STRIKES!",
      title: "Oh, crumbs!",
      body,
      actions: [
        { label: "Replay level", action: () => startGame(result.round) },
        { label: "Main menu", secondary: true, action: returnToMenu }
      ]
    });
    window.DishDashAudio.gameOver();
  }

  function returnToMenu() {
    closeModal();
    game.stop();
    window.DishDashAudio.stopMusic();
    setPauseButton(false);
    showScreen("menu");
    updateBest();
  }

  function pauseGame() {
    if (game.paused) {
      resumeGame();
      return;
    }
    const paused = game.pause();
    if (!paused) return;
    window.DishDashAudio.pauseMusic();
    setPauseButton(true);
    const overlay = document.createElement("div");
    overlay.className = "paused-screen";
    const label = document.createElement("strong");
    label.textContent = "Paused";
    overlay.append(label);
    board.append(overlay);
    openModal({
      icon: "⏸️",
      eyebrow: "TAKE YOUR TIME",
      title: "Game paused",
      body: "The dishes are holding their breath. Ready when you are!",
      actions: [
        { label: "Back to the game", action: resumeGame },
        { label: "Restart level", secondary: true, action: () => startGame(game.round) },
        { label: "Main menu", secondary: true, action: returnToMenu }
      ]
    });
  }

  function resumeGame() {
    closeModal();
    board.querySelector(".paused-screen")?.remove();
    game.pause();
    window.DishDashAudio.resumeMusic();
    setPauseButton(false);
  }

  $("#start-button").addEventListener("click", openLevelSelect);
  $("#how-button").addEventListener("click", () => openModal({
    icon: "📖",
    eyebrow: "READY, SET, SAVE",
    title: "How to play",
    body: makeHowToPlay(),
    actions: [{ label: "Got it!", action: closeModal }]
  }));
  $("#pause-button").addEventListener("click", pauseGame);
  modalClose.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop && activeModal?.closeAction) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "p" && !event.repeat) {
      const isPauseDialog = activeModal?.eyebrow === "TAKE YOUR TIME";
      if (isPauseDialog) {
        event.preventDefault();
        resumeGame();
      } else if (backdrop.hidden && gameScreen.classList.contains("is-active") && game.running) {
        event.preventDefault();
        pauseGame();
      }
    }
    if (event.key === "Escape" && !backdrop.hidden && activeModal?.closeAction) closeModal();
  });

  $("#sound-toggle").addEventListener("click", (event) => {
    soundEnabled = !soundEnabled;
    window.DishDashAudio.setEnabled(soundEnabled);
    event.currentTarget.textContent = soundEnabled ? "🔊" : "🔇";
    event.currentTarget.setAttribute("aria-label", soundEnabled ? "Mute all audio" : "Unmute all audio");
  });
  $("#music-volume").value = String(Math.round(window.DishDashAudio.musicVolume * 100));
  $("#sound-volume").value = String(Math.round(window.DishDashAudio.soundVolume * 100));
  $("#sound-toggle").textContent = soundEnabled ? "🔊" : "🔇";
  $("#sound-toggle").setAttribute("aria-label", soundEnabled ? "Mute all audio" : "Unmute all audio");
  $("#music-volume").addEventListener("input", (event) => {
    window.DishDashAudio.setMusicVolume(Number(event.currentTarget.value) / 100);
  });
  $("#sound-volume").addEventListener("input", (event) => {
    window.DishDashAudio.setSoundVolume(Number(event.currentTarget.value) / 100);
  });

  game = new window.DishDashGame({
    board,
    onUpdate: updateHud,
    onRoundEnd: renderRoundResult,
    onStrike: () => {},
    onSave: recordDishSaved
  });
  updateBest();
  updateCareerStats();
})();
