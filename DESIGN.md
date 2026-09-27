---
name: Smart Museum Guide
description: A dimensional gallery entrance and a calm reading companion for visitors, with a stable staff workspace.
colors:
  gallery: "#2D2824"
  gallery-glow: "#654337"
  gallery-cream: "#F7F1E7"
  gallery-brass: "#D8B77F"
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
  hero: "12px"
spacing:
  unit: "8px"
  section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  button-gallery:
    backgroundColor: "{colors.gallery-brass}"
    textColor: "{colors.gallery}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
---

# Design System: Smart Museum Guide

## Overview

**Creative North Star: "The gallery threshold"**

The Visitor Web home opens on a dark gallery stage. Real demonstration photographs form a dimensional collage beside a short invitation and a direct zone-code action. Inside a zone, the interface becomes a quiet catalogue sheet: the object, title, reading text, language control and available audio take priority. The native app carries the same identity through an image-led welcome and paper-based tour screens. Staff retain a calm, structured workspace for collection management.

The new mark is a four-corner focus frame around a diamond and brass centre. It appears as code-drawn SVG on web and native; its geometry suggests looking closely at an object. Newsreader and Be Vietnam Pro keep stories editorial and Vietnamese controls clear. Images in this repository are sourced demonstration assets; museum deployments replace them with approved collection media.

**Key Characteristics:** Image-led, editorial, dimensional at entry, quiet during reading, precise for staff.

## Colors

The home stage uses warm charcoal with a restrained brown glow. Gallery cream and brighter brass keep text and the primary action legible on that dark field. Warm paper is the reading canvas, ink carries primary text, and lacquer marks actions or key status. Brass is a quieter secondary accent on light surfaces. Hairline borders organize reading and staff information.

## Typography

Newsreader is for the large home invitation, exhibit titles and prominent headings. Be Vietnam Pro is for body text, controls, labels, tables and long narration. The web home title scales approximately from 3.5rem to 6.8rem with short lines; reading text stays within roughly 70 characters per line where space allows, with generous line height. Labels remain legible at 12px or larger.

## Layout

Visitor Web home uses a two-column hero on desktop: invitation and manual zone-code form on one side, dimensional artifact collage on the other. On small screens it becomes a single scroll sequence with the artwork still large enough to recognize. A simple three-step list follows the hero. Zone and exhibit routes return to paper: the desktop object-and-label composition becomes a single reading column on phones, with full narration below. Native welcome leads with a large photographed artifact and overlaid short headline, then language and tour actions. Native tour and exhibit screens retain a scrollable column and a persistent four-item tab bar. Admin retains its fixed left rail on desktop and horizontally scrollable navigation on small screens.

## Elevation & Depth

Depth belongs to the home artifact collage: three real object images sit on CSS 3D planes over faint concentric rings and a radial glow. Pointer tilt is subtle and leaves photographs legible at rest. Exhibit photography has a light hover lift on large screens. Reading pages and Admin panels stay flat at rest; open space and 1px borders create hierarchy. Focus uses a visible lacquer outline. Web copy and artwork enter once, native welcome photography reveals once, and the scan indicator pulses only while scanning. Web `prefers-reduced-motion` and native Reduce Motion remove these effects; motion never carries required information.

## Shapes

The four-corner frame and central diamond are the brand's recurring geometry, not an image placeholder. Controls are nearly square or gently rounded; the native welcome image has a 12px radius. Photographs retain their natural rectangular framing and identifying captions. Decorative rings stay behind real collection imagery on the home stage.

## Components

### Buttons

The gallery-stage zone action is brass on charcoal with a clear arrow icon. Primary reading and native actions are solid ink or deep lacquer with light text and a minimum 44px touch target. Secondary actions are bordered or quiet text buttons. Hover changes the fill; focus is clearly outlined.

### Cards / Containers

The home hero is one open stage, and the journey list uses dividers instead of nested cards. Reading content uses open space; only functional groups such as the audio player need a container. Admin panels use white surfaces, 1px line borders and small corners.

### Inputs / Fields

The home zone-code field sits beside its action on desktop and stacks on narrow screens. Light-surface fields use a surface background, visible border, 16px text on mobile, and an explicit label. Focus changes the border and retains a visible outline.

### Navigation

The focus-frame mark anchors Visitor Web and native mastheads. The zone header is quiet and keeps language selection close to the exhibit. Admin navigation always shows active state and meaningful icons; small-screen routes remain reachable by horizontal scrolling. Native tabs use drawn line icons and text labels.

### Artifact collage

The home collage uses real demonstration exhibit photographs, with a caption disclosing their status. Perspective, overlap and a brass label create the entry stage. This signature treatment does not repeat throughout reading screens.

## Do's and Don'ts

### Do:
- **Do** use approved object photographs and captions for content-bearing imagery.
- **Do** keep short descriptions, full narration text and audio controls distinct.
- **Do** keep controls and reading text legible on 320px and larger screens.
- **Do** keep the gallery entrance and paper reading surface connected through typography, the mark and restrained brass/lacquer accents.
- **Do** keep all actions available when motion is reduced.

### Don't:
- **Don't** use decorative arches or fake artifact silhouettes as image substitutes.
- **Don't** present demonstration collection assets as a deploying museum's own catalogue.
- **Don't** rely on color alone for status or navigation.
- **Don't** apply the home stage's perspective and shadows to every exhibit or Admin panel.
