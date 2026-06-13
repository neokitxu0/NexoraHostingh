---
name: NexoraHosting api-client-react setup
description: How @workspace/api-client-react must be initialized in the nexora frontend
---

The generated hooks in `@workspace/api-client-react` use a `customFetch` function that needs configuration before any hook is called.

**Rule:** Always call both setup functions in `main.tsx` before `createRoot(...).render(...)`.

**Why:** The custom-fetch module has module-level `_baseUrl` and `_authTokenGetter` vars. Without initialization, all requests go to the wrong URL and have no auth headers.

**How to apply:**
```ts
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

document.documentElement.classList.add("dark");

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
setBaseUrl(`${base}/api`);
setAuthTokenGetter(() => localStorage.getItem("nexora_token"));
```

Auth token lives in `localStorage` under key `nexora_token`. User object under `nexora_user`.
