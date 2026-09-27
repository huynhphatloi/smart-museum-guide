---
name: Smart Museum Guide
description: An image-led, readable museum guide for visitors and a calm working space for staff.
colors:
  paper: "#F5F2EB"
  surface: "#FBFAF6"
  ink: "#22211E"
  muted: "#66635E"
  line: "#D9D5CD"
  lacquer: "#803E31"
  lacquer-deep: "#522C26"
  brass: "#A77C42"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontWeight: 500
    lineHeight: 1.02
  body:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  sm: "3px"
  md: "6px"
spacing:
  unit: "8px"
  section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
---

# Design System: Smart Museum Guide

## Overview

**Creative North Star: "The photographic collection sheet"**

The object is the visual anchor. Visitors see real photographs, an unmistakable title, a short introduction, optional audio, and a complete reading text. Staff see the collection as structured work: zones, exhibits, schedules, maps and beacons in a stable navigation frame.

The pairing of Newsreader and Be Vietnam Pro gives exhibit stories an editorial voice while keeping controls and Vietnamese UI labels clear. Images in this repository are sourced demonstration assets; museum deployments replace them with approved collection media.

## Colors

Warm paper is the canvas, ink carries primary text, and lacquer marks actions or key status. Brass is a quiet secondary accent. Hairline borders organize information without heavy cards or shadows.

## Typography

Newsreader is for exhibit titles, section titles and prominent headings. Be Vietnam Pro is for body text, controls, labels, tables and long narration. Reading text stays within roughly 70 characters per line where space allows, with generous line height. Labels remain legible at 12px or larger.

## Layout

Visitor web uses a two-column object and label composition on desktop, then a single-column reading order on phones. Narration follows below in a dedicated reading measure. Admin uses a fixed left navigation rail on desktop and horizontally scrollable navigation on small screens. Native screens use a scrollable content column and a persistent four-item tab bar.

## Elevation & Depth

Surfaces are flat at rest. Background shifts and 1px borders create hierarchy; no resting drop shadows. Focus uses a visible lacquer outline.

## Shapes

Use nearly square controls and media. Photographs retain their natural rectangular framing. Avoid abstract arch artwork and decorative placeholder shapes.

## Components

### Buttons

Primary actions are solid ink or lacquer with white text and a minimum 44px touch target. Secondary actions are bordered or quiet text buttons. Hover changes the fill; focus is clearly outlined.

### Cards / Containers

Admin panels use white surfaces, 1px line borders and small corners. Visitor content uses open space; only functional groups such as the audio player need a container.

### Inputs / Fields

Fields use a surface background, visible border, 16px text on mobile, and an explicit label. Focus changes the border and retains a visible outline.

### Navigation

The visitor header is quiet and keeps language selection close to the exhibit. Admin navigation always shows active state and meaningful icons; mobile routes remain reachable by horizontal scrolling. Native tabs use drawn line icons and text labels.

## Do's and Don'ts

### Do:
- **Do** use approved object photographs and captions for content-bearing imagery.
- **Do** keep short descriptions, full narration text and audio controls distinct.
- **Do** keep controls and reading text legible on 320px and larger screens.

### Don't:
- **Don't** use decorative arches or fake artifact silhouettes as image substitutes.
- **Don't** present demonstration collection assets as a deploying museum's own catalogue.
- **Don't** rely on color alone for status or navigation.
