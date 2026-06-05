# Legacy Split Cutover Notes

The runtime has been cut over to a unified SSR-first app rooted in `src/`:

- `src/server` now serves both API and Vue SSR frontend.
- `src/domain` contains WhatsApp/Google/payments/cache/session domain services.
- `src/contracts` is the single contracts source used by backend and frontend.

Legacy `server/`, `web/`, and `interfaces/` are retained temporarily as archive/reference only during verification. Root scripts, Docker, and compose now target the unified app.
