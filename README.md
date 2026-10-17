# What Next?

A phone-friendly web app that picks what to watch or read next from your [AniList](https://anilist.co), based on how much time you have.

It's a single `index.html` file with no build step and no dependencies. Host it on GitHub Pages and add it to your home screen.

## Features

- **Pick for me:** choose Watch, Read, or Either, then how much time you have (15 min, 30 min, 1 hour, 2 hours). It suggests something from your Watching, Reading, Repeating, and Planning lists that fits, and tells you which episodes or chapters to do.
- **Genre filter:** the genre chips are built from what's actually in your list.
- **18+ filter:** show everything, only 18+ titles, or hide 18+ titles.
- **Discover tab:** search AniList for new anime or manga by type, genre, sort (Trending, Popular, Top rated, Newest), and title. Titles already on your list are marked.
- **Mark as done:** save your progress to AniList straight from a pick. It marks a title Completed when you finish it, and moves a Planning title to Current.
- **Blur covers:** hides cover art when you're in public.
- **Login required:** you must log in with your AniList account. There is no guest mode.

## How picks work

- Anime episodes use the show's real episode length (24 minutes if AniList doesn't list one).
- Manga chapters are estimated at 6 minutes each. Change `MIN_PER_CHAPTER` in `index.html` if that doesn't suit you.
- Airing shows only offer episodes that have already aired.
- Titles you're already in the middle of are favoured over Planning ones, and higher-rated titles are favoured a little. There's some randomness, so **Show me another** gives you different picks.

## Setup

### 1. Host it

1. Upload `index.html` to the root of a GitHub repo.
2. Go to **Settings → Pages**, set the source to **Deploy from a branch**, choose `main` and `/ (root)`, and save.
3. Wait about a minute, then open your site at `https://<your-username>.github.io/<repo-name>/`.

### 2. Create an AniList app (one time)

1. Open [anilist.co/settings/developer](https://anilist.co/settings/developer) and tap **Create New Client**.
2. Name it anything.
3. For **Redirect URL**, use the exact address of your site. The login screen shows it for you to copy.
4. Save it and copy the **Client ID** number.

### 3. Log in

Open your site, paste the Client ID, and tap **Log in with AniList**. Approve the request and you'll land back in the app, logged in.

On your phone, use your browser's **Add to Home screen** option to make it feel like an app.

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
