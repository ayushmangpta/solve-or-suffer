# Solve Or Suffer

Forces you to solve a random coding problem (LeetCode/GeeksForGeeks) twice a day by locking your browser. Keep your skills sharp and stay consistent with your coding practice.

### Download

Available for Firefox: [Get Solve Or Suffer on Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/solve-or-suffer/)

### Features

* Locks your browser to enforce answering a coding problem.
* Triggers twice a day to ensure consistent coding habits.
* Minimal, focused design.

### Installation for Development

1. Clone or download this repository.
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3. Click on "Load Temporary Add-on...".
4. Select the `manifest.json` file from the project directory.

### Project Structure

* `manifest.json`: Configuration and metadata for the extension.
* `background.js`: Handles alarms, storage, and logic.
* `content/`: Scripts and styles injected into coding platforms.
* `popup/`: UI for the extension's popup action.

### Permissions Used

* Storage: To save progress and settings.
* Alarms: To trigger the lock event at specific intervals.
* Web Navigation and Tabs: To monitor and control browser tabs for the locking feature.