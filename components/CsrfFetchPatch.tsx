"use client";

if (typeof window !== "undefined" && !(window as any).__csrfPatched) {
  (window as any).__csrfPatched = true;
  const original = window.fetch.bind(window);

  window.fetch = (input, init = {}) => {
    const method = (
      init.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      location.href,
    );

    if (
      !["GET", "HEAD", "OPTIONS"].includes(method) &&
      url.origin === location.origin
    ) {
      const token = document.cookie
        .split("; ")
        .find((c) => c.startsWith("csrf_token="))
        ?.split("=")[1];
      const headers = new Headers(
        init.headers ?? (input instanceof Request ? input.headers : undefined),
      );
      if (token) headers.set("X-CSRF-Token", token);
      init = { ...init, headers };
    }
    return original(input, init);
  };
}

export default function CsrfFetchPatch() {
  return null;
}
