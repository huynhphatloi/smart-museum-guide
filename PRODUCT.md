# Smart Museum Guide

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

- Museum visitors standing in a gallery, using a phone to identify the nearby exhibit and read or hear its guide in a chosen language.
- Museum staff using the Admin web console to maintain exhibits, translations, media, zones, schedules, QR codes, and beacon assignments.

## Product Purpose

Help a visitor get the current guide for the place they are standing, while allowing staff to change the displayed exhibit without replacing a physical QR label or beacon.

## Positioning

A zone resolves to its currently scheduled published exhibit. The same zone can be reached through QR or BLE, and staff manage that relationship centrally.

## Operating Context

Visitors may have brief attention, variable connectivity, and only one free hand in a gallery. The web QR route is the fallback when the native app or Bluetooth is unavailable. Staff primarily work on a desktop but may check status on a phone.

## Capabilities and Constraints

- Visitor Web: React, Vite and Tailwind; QR routes and multilingual exhibit content.
- Visitor Mobile: React Native and Expo; BLE discovery, QR scanning, exhibit reading, audio when available, map, and settings.
- Admin: Next.js and Tailwind; exhibit editing, publishing, zones, schedules, beacon management and positioning tools.
- Preserve existing visitor and staff workflows and the feature-first project boundaries. Beacon calibration and radio settings remain staff controls.
- The bundled exhibit photographs and copy are demonstration content. They must not be represented as objects owned by a deploying museum.

## Evidence on Hand

Twenty sourced demo exhibit photographs and Vietnamese reading scripts are recorded in `docs/demo-exhibit-sources.md`. Real museum catalogue approval, recorded narration, a production domain, and physical-gallery validation are not yet available.

## Product Principles

1. Put the actual object and its story before decorative branding.
2. Make the next visitor action clear without relying on instructions from staff.
3. Keep short labels, full reading text, and recorded audio clearly distinct.
4. Give staff a fast way to identify and repair incomplete visitor content.
5. Preserve QR access when BLE or connectivity fails.
