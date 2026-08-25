# Super Bazar

A responsive grocery shopping application built with Next.js, Supabase Auth, Supabase Postgres and Supabase Storage.

## Features

- Responsive grocery storefront, search, categories, wishlist and cart
- UPI QR checkout with merchant approval
- Google and email/password authentication
- Customer order history
- Protected admin APIs for products, stock, banners, payments and order status
- Separate mobile and desktop festival banners

## Setup

1. Run `supabase-schema.sql` in the Supabase SQL Editor.
2. Copy `.env.example` to `.env.local` and enter the project values.
3. Run `npm install` and `npm run dev`.

The Supabase service-role key must only be stored as a server-side Vercel environment variable. Never commit it or expose it with a `NEXT_PUBLIC_` prefix.
