# DishDash

**Dish Dash** is a colorful browser game about saving plates, cups, bowls, and other dishes before they hit the floor. Click or tap falling dishes to catch them, earn points, and see how many of the 30 increasingly challenging levels you can complete.

## Run the game with VS Code Live Server

Dish Dash is a static website: it uses HTML, CSS, and JavaScript and does not need a build step, package installation, or development server setup beyond Live Server.

1. Open **Visual Studio Code**.
2. Choose **File → Open Folder...** and open the folder containing the game files.
3. Check that `index.html`, `styles.css`, `app.js`, `game.js`, and `audio.js` are in that folder.
4. If **Go Live** is not visible in the VS Code status bar, install the **Live Server** extension:
   - Open the Extensions view (`Ctrl+Shift+X`).
   - Search for **Live Server** by Ritwick Dey.
   - Select **Install**.
5. Open `index.html` in the editor.
6. Click **Go Live** in the bottom-right corner of VS Code. Alternatively, right-click `index.html` and choose **Open with Live Server**.
7. Live Server opens the game in your browser at a local address, usually `http://127.0.0.1:5500/`.

**Tip:** Run the game through Live Server rather than opening `index.html` directly from File Explorer. Live Server serves the files over a local web address, which is a more reliable way to load the game and its audio.

## How to play

1. On the main menu, select **Let's play**.
2. Choose any unlocked level. New players start at Level 1; completing a level unlocks the next one.
3. Click or tap each falling dish to save it. Every saved dish adds a point to your round score.
4. Finish the 30-second round before three dishes hit the floor.
5. Complete all 30 levels to become a kitchen legend!

Each round lasts **30 seconds**. Later levels increase the challenge by making dishes fall faster and appear more frequently. A dish that reaches the floor earns one strike; the third strike ends the round.

Complete a round to earn up to **three stars**: each strike removes one star from the round result. You can replay completed levels to try for a better star rating. The level picker keeps your **best star result** for each level.

## Controls and options

- **Click or tap a falling dish** to save it.
- **Press `P`** during a round to pause; press `P` again to resume.
- Use the pause menu to resume, restart the current level, or return to the main menu.
- Adjust **Music** and **Sound FX** independently with the sliders in the top-right corner.
- Use the speaker button to mute or unmute all audio.
- Select **How to play** on the main menu for the in-game instructions.

Audio uses the browser's Web Audio support. If you do not hear it, click **Let's play** to start the game and activate audio, check that the browser tab and device are not muted, and make sure both audio sliders are above zero.

## Progress and stats

Dish Dash saves progress in your browser:

- **Unlocked levels** remain available when you return.
- **Best stars** are saved separately for each completed level.
- **Stars earned** on the main menu add together the best result from every level, out of **90** possible stars.
- **Dishes saved** counts every successfully caught dish, including catches during replays.
- **Personal best** tracks the highest level you have reached.

Progress is stored in browser `localStorage`, so it belongs to the browser and local address you use to play. If you switch browsers or use a different local address or port, the saved progress may not appear there.

## Project files

- `index.html` — page structure, main menu, game screen, and controls.
- `styles.css` — visual design, animations, and responsive layouts.
- `app.js` — menus, level selection, round results, audio controls, and saved progress.
- `game.js` — dish spawning and movement, clicks, scoring, timer, strikes, and round progression.
- `audio.js` — generated background music and sound effects, with separate volume controls.

## Requirements

- A modern web browser with JavaScript enabled.
- Visual Studio Code and the Live Server extension to use **Go Live**.
- An internet connection is needed to load the optional Google Fonts. The game itself does not require external libraries or packages.
