# What Next?

**Version 2.1.1** · Company: Tokyo Brotherhood · Creator: Hariharasuthan Karunakaran · Contributor: Claude (AI)

A phone-friendly web app that picks what to watch or read next from your [AniList](https://anilist.co), based on how much time you have.

It's a single `index.html` file with no build step and no dependencies. Host it on GitHub Pages and add it to your home screen.

## Features

- **Pick for me:** choose Watch, Read, or Either, then how much time you have (15 min, 30 min, 1 hour, 2 hours). It suggests something from your Watching, Reading, Repeating, and Planning lists that fits, and tells you which episodes or chapters to do.
- **Genre filter:** the genre chips are built from what's actually in your list.
- **18+ filter:** show everything, only 18+ titles, or hide 18+ titles.
- **Discover tab:** search AniList for new anime or manga by type, genre, sort (Trending, Popular, Top rated, Newest), and title. Titles already on your list are marked.
- **Mark as done:** save your progress to AniList straight from a pick. It marks a title Completed when you finish it, and moves a Planning title to Current.
- **Blur covers:** hides cover art when you're in public.
- **Anime and Manga lists:** your full AniList lists with status tabs, search, a filter sheet (sort, format, status, country, year, length, score, genres include/exclude) and list customisation (grid or list, columns, hide score or progress). Tap a card for quick view with +1 / -1 progress.
- **Trending:** trending anime and manga carousels on the Pick screen.
- **Media pages:** tap any title for a full page with score, favourites, genres, synopsis, characters, info, tags with spoiler toggle, where to watch, staff, relations, and recommendations. Relations and recommendations open their own pages.
- **Character, staff, and studio pages:** tap a character, staff member, studio, or producer on a media page to open its own page, with Set as Favorite, voice actors, series or media, roles, and See more. Tapping a title inside those pages opens it, and the back button walks back through every page.
- **List editor:** status, progress stepper, score slider, start and finish dates, rewatches, priority, custom lists, notes, private, favourite, and remove. Reaching the last episode completes the entry and sets dates automatically.
- **Profile:** your AniList banner and avatar (ring uses your AniList profile colour), a View on AniList button, anime, manga, following and followers counts, your anime and manga statistics, and your bio, with Stats, Chat, and Settings inside. The banner and avatar are read from AniList; the AniList API does not let apps change them.
- **Settings:** Discord and secrets, appearance (System, Light, Dark, AMOLED, custom colours), list options, privacy, and account. **Log out** is in Settings → Account Settings (tap twice to confirm).
- **Discord sync:** anime and manga updates from your AniList list are posted to Discord forum threads, run from inside the app.
- **Schedule:** a countdown to the next episode of every airing anime on your list.
- **Stats:** two tabs. **Overview** shows your AniList statistics with anime and manga side by side (totals, genres, status, demographics, formats, tags, score spread). **Progress** keeps backlog hours, titles finished this month, and the daily goal with a streak.
- **List Settings:** the same options as AniList's list settings page, saved to your account with Save Changes: scoring system and advanced scoring, default list order, split Completed by format, which list activity to stop creating, custom anime and manga lists (add or remove), and the section order (Start Reorder uses the up and down buttons). Removing a custom list also removes it from every title that uses it.
- **Relation map:** on a title's page, Relations > Relation map draws the whole franchise as a graph (source above, prequels above, sequels and side stories below). Toggle Core, Related, and Character links, zoom with the buttons or two fingers, tap a label or use Branches to fold a branch, switch to List view, and add titles to Planning straight from the map. Big franchises stop at about 90 titles (140 with Character links).
- **Offline:** installs to your home screen and shows your last saved list when you have no connection.
- **Chat:** one-to-one private messages with other AniList users, using AniList's own message system.
- **Login required:** you must log in with your AniList account. There is no guest mode.

## How picks work

- Anime episodes use the show's real episode length (24 minutes if AniList doesn't list one).
- Manga chapters are estimated at 6 minutes each. Change `MIN_PER_CHAPTER` in `index.html` if that doesn't suit you.
- Airing shows only offer episodes that have already aired.
- Titles you're already in the middle of are favoured over Planning ones, and higher-rated titles are favoured a little. There's some randomness, so **Show me another** gives you different picks.

## Setup

### 1. Host it

1. Upload `index.html`, `sw.js`, `manifest.webmanifest`, and the `assets/` folder to the root of a GitHub repo (the last three enable offline and home-screen install).
2. Go to **Settings → Pages**, set the source to **Deploy from a branch**, choose `main` and `/ (root)`, and save.
3. Wait about a minute, then open your site at `https://<your-username>.github.io/<repo-name>/`.

### 2. AniList login (one time, for the developer)
Login works like other AniList apps: the Client ID is built in, so users just tap **Login**, AniList opens in the browser, and they come back to the app signed in. Create two clients at [anilist.co/settings/developer](https://anilist.co/settings/developer):

- **Website client:** Redirect URL is your site address, for example `https://<your-username>.github.io/<repo-name>/`.
- **Android client:** Redirect URL is `whatnext://auth`.

Put the two Client IDs in `config.js` (`clientWeb` and `clientApp`). Client IDs are public, not secrets.

### 3. Log in
Tap **Log in with AniList** and approve. In the Android app the browser returns you to the app automatically. Advanced options also let you paste a login token.

## Logo and splash screen

The logo is `assets/logo-512.png` (and smaller copies). It is shown full screen for about a second when the app opens (see `#boot` in `index.html` and `SPLASH_MS` in `boot.js`), in the header, and on the login screen. The Android launcher icon and native splash are generated during the APK build from the pictures in `resources/` (step "Generate app icon and splash screen" in `.github/workflows/build-apk.yml`).

## Privacy

- Everything runs in your browser. There is no server and no analytics.
- Your login token and Client ID are stored in your browser's local storage on your own device, and are only sent to AniList.
- Log out to clear the saved token.
- The login wall is part of the page, so it controls what the app shows but isn't strong security by itself. Your private data stays protected by AniList and your account's token.

## Notes

- This is an unofficial app and isn't affiliated with AniList.
- 18+ features are for adults only. Content shown is whatever AniList lists as adult, and your AniList account settings apply.
- Discover only links to AniList pages. It doesn't link to streaming or reading sites.

## Built with

Plain HTML, CSS, and JavaScript, using the [AniList GraphQL API](https://docs.anilist.co/).

## Project structure (where to edit)

The app is split into folders, so one problem area can be fixed without touching the rest.

```
index.html          thin shell
boot.js             loads the screens and scripts in order
config.js           AniList client IDs
sw.js               offline support
manifest.webmanifest
assets/             logo, app icons and the splash-screen image
resources/          Android icon and splash sources (used only by the APK build)
css/                base, components, screens, login, trending, media, utilities
views/
  shell/            header, tab bar
  screens/          login, pick, discover, chat, schedule, stats, lists, profile
  settings/         menu and one file per settings page
  sheets/           filter sheet, customise sheet, media page and editor containers
js/
  core/             compat, core and Pick engine, tabs, auth, tracker, theme, start
  features/         discover, lists, media page, character/staff/studio pages, editor, sync, chat, settings, and so on
```

tests/              unit, structure, and screen tests (see below)
```

If you add a new screen or script file, add it to the lists inside `boot.js` and `sw.js`.

**Releasing a change:** whenever any file changes, change `REV` in `boot.js` and the matching name in `sw.js` (for example `2.1.1-r5` and `wn-2.1.1-r5`). That makes every phone fetch the new files together instead of mixing old and new ones. `node tests/check-structure.js` fails if the two do not match.

## Tracking (one place for every change)

Every change to a list entry goes through `js/core/tracker.js`: the +1 buttons on the lists, the media page, Pick's "Mark as done", the list editor, and adding to Planning.

- Status and dates follow the same rules everywhere: +1 on a Planning, Paused, or Dropped title starts it and fills the start date; reaching the last episode completes it and fills the finish date; finishing a rewatch completes it and adds one rewatch; lowering a completed title reopens it; starting a rewatch resets progress to 0.
- The screen updates instantly. AniList is updated right after, one request per title at a time, and a failed save is rolled back with a message.
- With no connection the change is kept on the device and sent when you are back online.
- Scores follow your AniList score format (100 point, 10 point decimal, 10 point, 5 star, or smiley).

## Tests

```
node tests/check-structure.js        files, lists, ids, CSS, versions
node tests/unit/rules.test.js        tracking rules and score formats
python tests/e2e/run_all.py          real-browser tests against a fake AniList (needs: pip install playwright && playwright install chromium)
```

The `Tests` workflow (`.github/workflows/tests.yml`) runs all three on every push.


## Getting the files into your repo from a phone

GitHub's phone upload can't take folders. Upload the single file `site.zip` to the repo root instead. The `Unpack site.zip` workflow (`.github/workflows/unpack-site.yml`) unzips it into the folders above, deletes the zip, and commits. In the APK repo it also starts the APK build.

## Credits

- Company: Tokyo Brotherhood
- Creator: Hariharasuthan Karunakaran
- Contributor: Claude (AI)
