# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Expense Tracker

Recurring expenses are added once for each month when that month is opened in the app. If a scheduled day does not exist in a month, the expense is dated on that month's last day. Removing a recurring rule does not remove expenses already created from it.

The production build includes an installable PWA and caches the app shell for offline use. Service workers require HTTPS, except on localhost. Use `npm run build` and `npm run preview` to test the installable/offline build; the Vite development server does not register the production service worker.

An optional six-digit app PIN can be set from the header. The app asks for it on the next launch, and can also be locked manually. The PIN is stored as a salted hash, but this convenience lock does not encrypt IndexedDB expense data.
