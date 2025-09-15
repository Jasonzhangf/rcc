# Changelog

## [0.1.2] - 2025-09-14

### Fixed
- Fixed "TypeError: res.status is not a function" by changing app.use('*') to app.all('*') in request handling
- Fixed "PayloadTooLargeError: request entity too large" by adding proper bodyLimit configuration
- Improved error handling in HTTP server component

## [0.1.1] - 2025-09-11

### Added
- Initial release with HTTP server, virtual model routing, and pipeline integration
- Support for configuration system integration
- Basic error handling and monitoring capabilities