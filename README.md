This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## n8n workflow for Telegram campaigns

The repository now includes a ready-to-import n8n workflow for the `rassylka_zapustit` button flow:

- Workflow file: `n8n/workflows/rassylka_telegram.json`
- Trigger type: Webhook
- Expected action code: `rassylka_zapustit`
- Delivery channel: Telegram only

### How it works

1. The platform button calls `callWebhook("rassylka_zapustit", ...)`.
2. n8n receives the payload on the webhook endpoint.
3. The workflow normalizes the request and reads `recipient_ids`.
4. It loads recipients from Supabase table `clients_tg`.
5. It filters to clients with a Telegram username/chat identifier.
6. It sends the campaign text through the Telegram bot node.
7. It returns a JSON summary to the platform.

### Required setup in n8n

1. Import `n8n/workflows/rassylka_telegram.json`.
2. Configure credentials:
   - `Growice Supabase`
   - `Growice Telegram Bot`
3. Copy the production webhook URL from n8n.
4. Save this URL in Supabase table `webhooks` for action code `rassylka_zapustit`.
5. Activate the workflow.

### Important

The platform now forces Telegram campaign execution semantics for this action:
- transport: `telegram`
- channel filter: `Telegram`
- telegram filter: `yes`

This ensures the workflow only targets Telegram-reachable clients.
