# Changelog

All notable changes to YTgify Firefox extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.10] - TBD

### Breaking Changes
- **Removed built-in GIF library**: GIFs now download directly to your browser's downloads folder instead of being saved to extension storage
- Existing saved GIFs will be automatically removed when updating to this version

### Changed
- Simplified GIF creation flow - GIFs now download immediately without saving to extension storage
- Reduced extension memory footprint and complexity
- Updated success screen messaging to clarify GIF download behavior
- Improved extension performance by removing IndexedDB operations

### Added
- Migration system to automatically clean up deprecated GIF storage on extension update
- Clear user messaging about GIF download location

### Technical
- Removed IndexedDB `YouTubeGifStore` database and all associated storage code
- Deprecated `SaveGifRequest` and `SaveGifResponse` message types
- Added `src/background/migrations.ts` for handling extension update migrations
- Added `src/storage/cleanup.ts` utility for database cleanup operations

### Migration Notes
- On update, the extension will automatically and silently clean up old GIF data stored in IndexedDB
- This is a one-time operation that runs when you first update to version 1.0.10
- User preferences and settings are preserved during the migration
- GIFs will continue to be created and downloaded normally after the update

## [1.0.8] - Previous Release

See git history for changes prior to 1.0.10.
