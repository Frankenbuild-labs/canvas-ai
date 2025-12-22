# Email Templates Providers (Unlayer / Stripo)

The Templates page at `/email/templates` can show a gallery of fully designed, pre‑built templates using third‑party providers.

## Enable Unlayer Gallery

1. Sign up at https://unlayer.com and create a project to obtain your Project ID.
2. Add the following to `.env.local`:

```env
NEXT_PUBLIC_EMAIL_TEMPLATES_PROVIDER=unlayer
NEXT_PUBLIC_UNLAYER_PROJECT_ID=<YOUR_UNLAYER_PROJECT_ID>
```

3. Restart the dev server. The page will embed Unlayer's template gallery.

## Enable Stripo (Advanced)

Stripo requires client auth and a server‑side token exchange flow.

1. Sign up at https://stripo.email and obtain Client ID and Secret.
2. Add to `.env.local`:

```env
NEXT_PUBLIC_EMAIL_TEMPLATES_PROVIDER=stripo
NEXT_PUBLIC_STRIPO_CLIENT_ID=<YOUR_STRIPO_CLIENT_ID>
# STRIPO_CLIENT_SECRET should be stored server‑side only (do not expose publicly)
```

3. Implement a token exchange API route to securely mint Stripo auth tokens. Once configured, the gallery can be embedded.

See `components/email-marketing/ProviderTemplatesHub.tsx` for inline notes.

## Notes

- When no provider is configured, the page shows a helpful notice rather than fake templates.
- Your own saved templates remain available under "Your Templates".
