# silTube

Android TV / Android / desktop client for YouTube and YouTube Music with a
remote-first interface.

This snapshot is a debranded working tree: upstream names, URLs, package IDs,
and artwork have been removed. The app currently uses the placeholder identity:

| Item | Value |
| --- | --- |
| Display name | `silTube` |
| Android / iOS package | `com.example.video` |
| Deep-link scheme | `videoapp` |
| Internal prefix | `VideoApp` |

Replace those with your own identity before publishing. See `BUILD.md` for the
rebuild steps and where to drop in a new icon.

## Layout

- `app/`, `components/`, `states/`, `lib/` — React Native / Expo app
- `content/` — script injected into the YouTube web page
- `modules/video-app-view/` — native Android WebView module
- `android/` — generated native project
- `desktop/`, `extension/`, `flatpak/` — optional desktop and browser builds

## License

The upstream code is licensed under the GNU Affero General Public License v3.
See `LICENSE`. Keep that license and its notices when redistributing.
