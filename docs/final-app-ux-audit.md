# Smart Museum Guide: final app review

Reviewed 27 September 2026 from the current source and the locally running visitor web and Admin login pages. Mobile screens and authenticated Admin pages were reviewed in source; real phone, beacon, and production deployment behavior still need device testing.

## Product bar

A visitor should scan a QR code or enter a zone, understand the exhibit in their language, choose whether to play audio, and recover from a failed scan or connection without staff help. Staff should publish a complete exhibit, schedule it in a zone, preview exactly what visitors will see, and spot broken content before opening day.

## Release blockers

| Priority | Finding and evidence | Finish condition |
| --- | --- | --- |
| P0 | The live `/q/ZONE_A01` page showed a seed graphic with “Sample exhibit image (seed data)”; the old audio files were 1.8-second samples. | Four sourced demo images now replace seed graphics, and sample audio was removed. The local demo database was updated without resetting staff, beacons, or schedules. Public launch still needs museum-approved media, rights review, translations, and pronunciation review. |
| P0 | Admin login exposes the development account in its default email and hint. | Production build shows neither. This is now fixed in code; verify the deployed build and change default credentials before release. |
| P0 | Physical BLE behavior is not proven by source review or a QR web demo. | Test iOS and Android development/release builds in the actual galleries, with real beacons, permission denied, Bluetooth off, weak/overlapping signals, background/foreground, and QR fallback. Record zone accuracy and time to first result. |
| P0 | The mobile deep-link configuration still includes `https://museum.example.com`; public URLs and API defaults also have localhost fallbacks. | The API now rejects localhost, sample domains, and non-HTTPS public URLs in production; demo seeding is disabled there. Set real domains, universal/app links, QR target, CORS, and API URLs, then scan printed QR codes on both platforms. |
| P0 | No end-to-end staff preview of the visitor result is evident from the Admin exhibit editor and zone scheduling flow. | Add a staff preview for each zone and language showing the exact published exhibit, media, audio, translation fallback, and active schedule at a chosen time. Do not rely on a count or status badge as approval. |

## Visitor experience

| Priority | Improvement | Finish condition |
| --- | --- | --- |
| P1 | Make the first action unmistakable. The web home still leads with an abstract arch. | The QR instruction and manual-code fallback now sit with the form, with a real label and an example placeholder. Test with first-time visitors who have not seen a demo. |
| P1 | Make errors actionable. A missing assignment previously suggested trying another zone, which a visitor may not know how to find. | The error now shows the scanned zone, a route back to code entry, and an instruction to ask staff when content is unavailable. Verify with visitor testing. |
| P1 | Preserve recovery on mobile. The QR error path cleared the exhibit, leaving Retry with no zone to request. | The last zone/beacon is now retained for Retry and language changes. Verify on a device with a deliberately failed QR request. |
| P1 | Keep UI language consistent. The web audio panel and generic state eyebrow contained English literals, and mobile BLE failure strings were hardcoded in English. | These strings now use the language dictionaries. Check each offered locale, including fallback notices, with native speakers before public launch. |
| P1 | Provide useful offline behavior in a building with patchy connectivity. Mobile caches language options, but exhibit content/audio still depends on a live request. | Define an offline policy: cache recently opened exhibits and audio with expiry, show “saved copy” and last update, and prevent stale schedules from appearing current. |
| P2 | Improve content accessibility. Images have alt text on web, but mobile images do not expose meaningful descriptions; video has no caption/transcript path in the visitor UI. | Require alt text and caption/transcript fields when publishing relevant media. Verify screen readers, large text, contrast, focus, and controls on representative devices. |
| P2 | Replace generic museum geometry with real collection material. The current layout is coherent, but the arch, rings, and “01” motif occupy premium screen space without teaching the exhibit. | Use genuine artifact photography and collection details as the visual identity; retain the warm palette and readable editorial typography. |

## Staff experience

| Priority | Improvement | Finish condition |
| --- | --- | --- |
| P1 | List failures looked like empty collections on Zones, Beacons, and Exhibits. | The lists now show a separate error state and Retry action. Verify each against an unavailable API. |
| P1 | Lists requested `pageSize=100` and rendered only returned items, while showing the total. | Zones, Beacons, and Exhibits now have page controls and visible ranges. The zone assignment picker has server search for published exhibits. Check very large collections with staff data. |
| P1 | Make publication readiness visible. A published status does not guarantee a hero image, approved translation, playable audio, or an active schedule. | Exhibit editor now shows a content, image, audio, and placement checklist. This is advisory; add museum-approved publication rules and zone-level checks before launch. |
| P1 | Exhibit filter chips displayed raw `ALL`, `DRAFT`, `PUBLISHED`, `ARCHIVED`; some status badges and technical beacon fields remain raw. | Filter chips are translated. Translate remaining status badges, explain status transitions, and separate daily staff tasks from radio diagnostics. |
| P2 | Deletion uses browser `window.confirm`, which cannot show dependencies clearly. | Use a focused confirmation showing affected beacon assignments or schedule entries and the recovery path. Prefer archive where retention matters. |
| P2 | The dashboard reports current zone content, but no explicit “visitor test” route is surfaced there. | Zone detail now links to its QR visitor page. Add a direct dashboard action and language/time preview. |

## Release validation

1. Run a content inventory for every zone: approved title, description, image, rights, alt text, audio, transcript, languages, schedule, QR label, and beacon ID.
2. Walk the gallery with visitors unfamiliar with the project. Measure first successful exhibit, QR fallback use, language switching, audio completion, and failures needing staff.
3. Check iOS and Android with Bluetooth on/off, denied/revoked permissions, camera denial, airplane mode, and large text/screen reader settings.
4. Check web on a small phone, slow network, and keyboard-only navigation. Confirm media loading and recovery messages.
5. Run the full staff workflow on the deployed environment: create, translate, upload, publish, assign, preview, rotate, archive, and recover from API failure.
6. Verify domain, certificates, media storage, backup/restore, monitoring, and production environment variables before printing QR labels.

## Changes made during this review

- Production Admin login no longer pre-fills or advertises the seed account.
- Zones, Beacons, and Exhibits lists distinguish API errors from empty collections and offer Retry.
- Mobile remembers the last zone or beacon request so Retry and language switching work after a failed lookup.
- Visitor web now uses localized audio and error controls, a clear manual-code label, and source captions for seeded photographs.
- Admin lists now paginate and label API errors separately; zone detail searches published exhibits and opens the QR visitor page.
- Four sourced demo images replace the SVG placeholders, and the local demo database was refreshed without deleting staff, beacons, or schedules.
- Production API configuration rejects non-HTTPS and sample-domain public URLs and CORS origins; demo seeding is disabled in production.
- Exhibit editor shows a visitor-readiness checklist and recovers from a failed load.

These changes improve specific failure paths. The app is ready to call a final museum experience only after the release blockers and real-gallery validation above are complete.
