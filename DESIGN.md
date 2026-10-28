---
version: alpha
name: Zingo
description: >-
  The design system of Zingo, the Zcash wallet (zingo-mobile). Dark, calm,
  minimal surfaces with one green accent, built around the image of a plant.
  Every value below mirrors app/theme; the prose explains when to use each one.
# Values mirror app/theme. Change app/theme first and this block in the same
# commit. Once scripts/design-md exists, this block is generated from
# app/theme and CI fails when the two disagree; edit only the prose by hand.
colors:
  # Surfaces
  bgCanvas: "#060B12"
  bgSurface: "#031124"
  bgChrome: "#031124"
  bottomSheetBorder: "#05234C"
  borderFocus: "#0B3A75"
  borderSubtle: "#FFFFFF0F"
  sheetHandle: "#1B3C6B"
  bgScrim: "#02060C9E"
  # Text and neutrals
  fgDefault: "#D3E2F8"
  fgMuted: "#8DA0B8"
  fgOptionIcon: "#B1BBC5"
  borderMuted: "#4A6487"
  bgMuted: "#8DA0B8"
  bgMutedSubtle: "#8DA0B81F"
  # Accent (the one green)
  fgAccent: "#149D05"
  borderAccent: "#149D05"
  bgAccent: "#149D05"
  bgAccentSubtle: "#149D051F"
  fgOnAccent: "#060B12"
  fgAccentDisabled: "#16700B"
  borderAccentDisabled: "#0D540C"
  bgAccentDisabled: "#0D540C"
  # Status
  fgSyncing: "#EBFF5A"
  borderSyncing: "#EBFF5A"
  fgWarning: "#F99D00"
  borderWarning: "#65491C"
  bgWarning: "#1E1A10"
  bgWarningSubtle: "#F99D001F"
  fgDanger: "#E5484D"
  borderDanger: "#E5484D"
  bgDanger: "#E5484D"
  bgDangerSubtle: "#E5484D1F"
  # Special roles
  fgViewOnly: "#8FB4E6"
  bgViewOnlySubtle: "#8FB4E61F"
  bgNym: "#07FF94"
  fgNym: "#07FF94"
  bgNymSubtle: "#07FF941F"
  # Switch (exception D): the off track, the deep end of the on gradient
  # (which starts at bgAccent), the nym variant's gradient, the thumb
  bgSwitchOff: "#7E7E7E"
  bgSwitchOnDeep: "#0A4004"
  bgSwitchNym: "#14E76F"
  bgSwitchNymDeep: "#049959"
  fgSwitchThumb: "#FFFFFF"
  fgPriceUp: "#3CC52A"
  fgPriceDown: "#F2878A"
  # Pools
  fgOrchard: "#4E8E96"
  borderOrchard: "#2E5E66"
  bgOrchard: "#0B1D26"
  fgSapling: "#8DBF7A"
  borderSapling: "#314533"
  bgSapling: "#141D1C"
  fgIronwood: "#E4C28F"
  borderIronwood: "#5A4630"
  bgIronwood: "#241A12"
  fgTransparent: "#E6C46A"
  bgTransparent: "#E6C46A1F"
  # Brand and QR
  bgSproutPot: "#5A3A1E"
  fgQrInk: "#060B12"
  bgQrPaper: "#FFFFFF"
  # Contact avatars and chart series
  fgCategory1: "#149D05"
  bgCategory1: "#149D051F"
  fgCategory2: "#8FB4E6"
  bgCategory2: "#8FB4E61F"
  fgCategory3: "#E6C46A"
  bgCategory3: "#E6C46A1F"
  fgCategory4: "#F07A86"
  bgCategory4: "#F07A861F"
  fgCategory5: "#B79CF2"
  bgCategory5: "#B79CF21F"
  # Tab bar (exception A)
  bgTabBar: "#040C17"
  borderTabBar: "#0B1D36"
  bgTabCapsule: "#D3E2F81A"
  fgTabIdle: "#BABBBE"
  fgTabSelected: "#F7F8FA"
  shadowTabBar: "#00000073"
typography:
  balance:
    fontFamily: system-ui
    fontSize: 36px
    fontWeight: 700
    lineHeight: 40px
  screenTitle:
    fontFamily: system-ui
    fontSize: 22px
    fontWeight: 700
    lineHeight: 28px
  subtitle:
    fontFamily: system-ui
    fontSize: 18px
    fontWeight: 700
    lineHeight: 24px
  barTitle:
    fontFamily: system-ui
    fontSize: 16px
    fontWeight: 700
    lineHeight: 28px
  button:
    fontFamily: system-ui
    fontSize: 16px
    fontWeight: 700
    lineHeight: 20px
  bodyStrong:
    fontFamily: system-ui
    fontSize: 15px
    fontWeight: 600
    lineHeight: 21px
  body:
    fontFamily: system-ui
    fontSize: 15px
    fontWeight: 400
    lineHeight: 21px
  bodySmall:
    fontFamily: system-ui
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
  caption:
    fontFamily: system-ui
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
  address:
    fontFamily: Menlo, monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
rounded:
  xs: 4px
  sm: 8px
  md: 12px
  sheet: 28px
  pill: 999px
spacing:
  space4: 4px
  space8: 8px
  space12: 12px
  space16: 16px
  space20: 20px
  space24: 24px
  space32: 32px
components:
  button-primary:
    backgroundColor: "{colors.bgAccent}"
    textColor: "{colors.fgOnAccent}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: 44px
    padding: 24px
  button-primary-small:
    backgroundColor: "{colors.bgAccent}"
    textColor: "{colors.fgOnAccent}"
    typography: "{typography.bodySmall}"
    rounded: "{rounded.pill}"
    height: 32px
    padding: 16px
  button-primary-disabled:
    backgroundColor: "{colors.bgAccentDisabled}"
    textColor: "{colors.fgOnAccent}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: 44px
  button-secondary:
    backgroundColor: "{colors.bgCanvas}"
    textColor: "{colors.fgDefault}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: 44px
    padding: 24px
  button-text:
    textColor: "{colors.fgAccent}"
    typography: "{typography.button}"
    height: 44px
  button-quiet:
    textColor: "{colors.fgMuted}"
    typography: "{typography.button}"
    height: 44px
  button-danger-text:
    textColor: "{colors.fgDanger}"
    typography: "{typography.button}"
    height: 44px
  button-danger:
    backgroundColor: "{colors.bgDanger}"
    textColor: "{colors.fgOnAccent}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: 44px
  button-nym:
    backgroundColor: "{colors.bgNym}"
    textColor: "{colors.fgOnAccent}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: 44px
  button-view-only:
    backgroundColor: "{colors.bgViewOnlySubtle}"
    textColor: "{colors.fgDefault}"
    typography: "{typography.bodySmall}"
    rounded: "{rounded.pill}"
    height: 32px
    padding: 16px
  text-field:
    backgroundColor: "{colors.bgSurface}"
    textColor: "{colors.fgDefault}"
    typography: "{typography.bodyStrong}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 12px
  text-field-on-surface:
    backgroundColor: "{colors.bgCanvas}"
    textColor: "{colors.fgDefault}"
    typography: "{typography.bodyStrong}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 12px
  field-label:
    textColor: "{colors.fgMuted}"
    typography: "{typography.bodySmall}"
  field-error:
    textColor: "{colors.fgDanger}"
    typography: "{typography.bodySmall}"
  card:
    backgroundColor: "{colors.bgSurface}"
    textColor: "{colors.fgDefault}"
    rounded: "{rounded.md}"
    padding: 16px
  card-on-surface:
    backgroundColor: "{colors.bgCanvas}"
    textColor: "{colors.fgDefault}"
    rounded: "{rounded.md}"
    padding: 16px
  card-selected:
    backgroundColor: "{colors.bgAccentSubtle}"
    textColor: "{colors.fgDefault}"
    rounded: "{rounded.md}"
    padding: 16px
  detail-rows:
    backgroundColor: "{colors.bgCanvas}"
    textColor: "{colors.fgDefault}"
    typography: "{typography.bodySmall}"
    rounded: "{rounded.md}"
    padding: 16px
  detail-row-label:
    textColor: "{colors.fgMuted}"
    typography: "{typography.caption}"
  list-row:
    textColor: "{colors.fgDefault}"
    typography: "{typography.bodyStrong}"
    height: 56px
    padding: 20px
  radio-row:
    textColor: "{colors.fgDefault}"
    typography: "{typography.bodyStrong}"
    height: 56px
    padding: 16px
  chip:
    textColor: "{colors.fgMuted}"
    typography: "{typography.bodySmall}"
    rounded: "{rounded.pill}"
    height: 32px
    padding: 12px
  chip-selected:
    backgroundColor: "{colors.bgAccentSubtle}"
    textColor: "{colors.fgAccent}"
    typography: "{typography.bodySmall}"
    rounded: "{rounded.pill}"
    height: 32px
    padding: 12px
  tag-accent:
    backgroundColor: "{colors.bgAccentSubtle}"
    textColor: "{colors.fgAccent}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: 8px
  tag-warning:
    backgroundColor: "{colors.bgWarningSubtle}"
    textColor: "{colors.fgWarning}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: 8px
  tag-transparent:
    backgroundColor: "{colors.bgTransparent}"
    textColor: "{colors.fgTransparent}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: 8px
  tag-view-only:
    backgroundColor: "{colors.bgViewOnlySubtle}"
    textColor: "{colors.fgViewOnly}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: 8px
  notice:
    backgroundColor: "{colors.bgSurface}"
    textColor: "{colors.fgDefault}"
    typography: "{typography.bodyStrong}"
    rounded: "{rounded.md}"
    padding: 16px
  notice-body:
    textColor: "{colors.fgMuted}"
    typography: "{typography.bodySmall}"
  note-warning:
    backgroundColor: "{colors.bgWarning}"
    textColor: "{colors.fgDefault}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: 12px
  title-bar:
    textColor: "{colors.fgDefault}"
    typography: "{typography.barTitle}"
    padding: 16px
  panel:
    backgroundColor: "{colors.bgSurface}"
    textColor: "{colors.fgDefault}"
    rounded: "{rounded.sheet}"
    padding: 20px
  scrim:
    backgroundColor: "{colors.bgScrim}"
  toast-action:
    backgroundColor: "{colors.bgSurface}"
    textColor: "{colors.fgDefault}"
    typography: "{typography.bodySmall}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 16px
  option-icon:
    textColor: "{colors.fgOptionIcon}"
    size: 30px
  avatar-md:
    backgroundColor: "{colors.bgCategory1}"
    textColor: "{colors.fgCategory1}"
    typography: "{typography.bodyStrong}"
    rounded: "{rounded.pill}"
    size: 36px
  avatar-lg:
    backgroundColor: "{colors.bgCategory1}"
    textColor: "{colors.fgCategory1}"
    typography: "{typography.subtitle}"
    rounded: "{rounded.pill}"
    size: 48px
  balance:
    textColor: "{colors.fgDefault}"
    typography: "{typography.balance}"
  address:
    textColor: "{colors.fgDefault}"
    typography: "{typography.address}"
  qr:
    backgroundColor: "{colors.bgQrPaper}"
    textColor: "{colors.fgQrInk}"
    rounded: "{rounded.md}"
  tab-bar:
    backgroundColor: "{colors.bgTabBar}"
    textColor: "{colors.fgTabIdle}"
    rounded: "{rounded.pill}"
    width: 366px
    height: 60px
    padding: 5px
  tab-bar-shrunk:
    backgroundColor: "{colors.bgTabBar}"
    textColor: "{colors.fgTabIdle}"
    rounded: "{rounded.pill}"
    width: 250px
    height: 50px
    padding: 4px
  tab-selected:
    backgroundColor: "{colors.bgTabCapsule}"
    textColor: "{colors.fgTabSelected}"
    rounded: "{rounded.pill}"
  # Exception D. On, the track is a vertical gradient from bgAccent (top)
  # to bgSwitchOnDeep.
  switch-on:
    backgroundColor: "{colors.bgAccent}"
    textColor: "{colors.fgSwitchThumb}"
    rounded: "{rounded.pill}"
    width: 40px
    height: 19px
  # The nym variant's on track runs from bgSwitchNym (top) to bgSwitchNymDeep.
  switch-on-nym:
    backgroundColor: "{colors.bgSwitchNym}"
    textColor: "{colors.fgSwitchThumb}"
    rounded: "{rounded.pill}"
    width: 40px
    height: 19px
  switch-off:
    backgroundColor: "{colors.bgSwitchOff}"
    textColor: "{colors.fgSwitchThumb}"
    rounded: "{rounded.pill}"
    width: 40px
    height: 19px
---

## Overview

Zingo is a private Zcash wallet. Its interface is dark, quiet and minimal:
deep navy surfaces, light blue-grey text and a single green accent. The brand
grows from the image of a plant: a sprout, leaves, a green that means "go".
Nothing competes with the user's money and the one action they came to take.

**Where things come from.** `app/theme` (tokens, typography, radii, spacing,
sizes, motion) and the shared components in `ui/primitives` and `ui/widgets`
are the source of truth. Design prototypes (HTML artifacts, Figma) define
**layout, content and flows only**. Their pixel values, type sizes, radii and
colours are never copied into the app: each one maps to the nearest value of
this system. A value or a variant the system lacks is added to the system
first, approved by the designer, and only then used on a screen.

**Text.** The system font (San Francisco on iOS, Roboto on Android) for
everything, and the platform monospace (Menlo, monospace) for addresses, keys
and transaction ids. Every text uses a `Text` variant; nobody sets
`fontSize`, `lineHeight` or `letterSpacing` by hand.

**Language.** The app ships in five catalogs (en, es, pt, ru, tr). Every new
string goes into all five.

## Colors

A colour is always named by its token, never by its value (the ESLint colour
lock enforces it). The names are a surface plus a role: `bg` fills, `fg` text
and glyphs, `border` strokes (see `CONTEXT.md`, "Theme tokens").

**Surfaces.** `bgCanvas` (#060B12) is the screen. `bgSurface` (#031124) is the
panel, every sheet and the cards on the canvas. `bottomSheetBorder` (#05234C)
is the edge of panels, sheets, cards and fields. `borderSubtle` is the hairline
between rows inside a card.

**The contrast rule.** Whatever sits on a surface is one step away from it: on
`bgSurface` (the panel, a sheet, a full panel) cards, fields, detail rows and
secondary buttons are `bgCanvas`; on `bgCanvas` they are `bgSurface`. This is
built once, not painted screen by screen: `AppSheet`, `AppSheetModal` and
`FullPanel` set `SurfaceContext`, and `Card`, `TextField`, `DetailRows`,
`RadioList` and `Button` `secondary` read it through `useInsetFill()`.

**One green.** `fgAccent` / `bgAccent` (#149D05) is the only green of the
interface: the primary button, links and text actions, checks, the back
arrow, the flip button, received amounts, "Confirmed", the selected tab's
leaf and the selected tab. `fgPriceUp` (#3CC52A) and `fgPriceDown` are only
for a price that moved (`CurrencyAmount`); they are never a second accent.

**One warning colour.** `fgWarning` (#F99D00), with `bgWarningSubtle`,
`bgWarning` and `borderWarning`, is for states that are not errors yet:
confirming, in mempool, offline, no routes, refunds, and every warning note.

**The transparent pool keeps its yellow.** `fgTransparent` / `bgTransparent`
(#E6C46A) marks the transparent pool and nothing else, always next to the
pool's name: the eye icon in Receive, the "public" tag, the line under a field
when the address is transparent, the Address Book's public rows. In Pools its
total is yellow only while it holds funds; at zero it looks like the other
pools. A state is
never painted with it.

**Errors.** `fgDanger` / `bgDanger` (#E5484D) is for errors and destructive
actions only, never decoration.

**Roles that own their colour.**
- `bgNym` (#07FF94): only actions and marks that go through the Nym mixnet.
  `fgNym`, the same green, is for text and icons that say something goes
  through the mixnet.
- `fgViewOnly` / `bgViewOnlySubtle`: the view-only (watch-only) wallet: the
  snowflake, its tiles, its tag and the view-only notice's button. Also the
  viewing key's rows: the viewing key is what makes a view-only wallet, so it
  takes that role's colour.
- `fgSyncing` (#EBFF5A): sync progress.
- `fgOptionIcon` (#B1BBC5): the artwork icons of the options panel (the side
  menu), so they all read at one weight and tone.
- Pool families (`fgOrchard`, `fgSapling`, `fgIronwood` and their borders and
  fills): the same on every screen, always next to the pool's name.
- Categories 1–5: contact avatars and chart series. A contact keeps its
  category for life.
- `fgQrInk` on `bgQrPaper`: every QR, whatever the theme, so it scans.

**Pools in Receive.** Only the icon carries the pool's colour (a green shield,
a yellow eye); the pool's name is `fgDefault`.

## Typography

One variant per role. Weight overrides are limited to the cases listed here.

| Role | Style |
|---|---|
| Balance, the hero amount of a detail or review | `balance` 36/40; the unit after it in `subtitle`, `fgMuted` |
| State title (sending, tracking, a result) | `subtitle` 18/24 |
| Title of any bar: panels, sheets and menu screens | `barTitle` 16/28, through `TitleBar` or the menu screens' header |
| Title of a dialog-like sheet (Shield, Confirm, Authorize) | `bodyStrong` 700 |
| Button label | `button` 16/20; a `small` button uses `bodySmall` 700. A disabled filled button keeps its dark label on `bgAccentDisabled` |
| Value typed in a field | `bodyStrong` (`address` for an address or a key) |
| Chip label | `bodySmall` 600: `fgMuted`, `fgAccent` when selected |
| Tag | `caption` 600 in the tone's colour |
| Avatar initial | `bodyStrong` 700 (md), `subtitle` (lg); the own wallet's avatar is the wallet icon in `fgViewOnly` |
| Row title, notice title, what happened in a detail hero | `bodyStrong` 15/21 |
| Body text, empty state | `body` 15/21 (empty state in `fgMuted`) |
| Label over a field or a card | `bodySmall` 600, `fgMuted` |
| Converted value under an amount | `bodySmall`, `fgMuted` |
| Row subtitle, notice body | `bodySmall`, `fgMuted` |
| Error under a field | `bodySmall`, `fgDanger` (as `TextField`'s error) |
| Detail row | label `caption` `fgMuted`; value `bodySmall` 600 (700 for a total) |
| Available / fee line | `caption` |
| Lead under a sheet title, note, hint, counter | `caption`, `fgMuted` |
| Text of a compact note (warnings outside Home) | `caption`, regular, never bold |
| Link inside content ("Save contact", "See why", "Clear") | `caption` 700 |
| A tappable text that isn't green (a link in a warning, "Flashnet", "Add tag", Available) | Underlined, in its own colour. Green text buttons are not |
| Month label in History | `caption` 600, `fgMuted`, uppercase |
| Mixnet wait lines | `bodySmall` `fgMuted` + `body` 500 for the state |
| Address, key, transaction id | `address` (mono 13/18) |

**Amounts.** Every ZEC amount shows at least one decimal and no trailing
zeros (0.1, 2.0, 1.6234): up to 4 decimals from 1 ZEC and 8 under it, cut,
never rounded up. Fiat shows two decimals. Only money in or out carries a
sign: "+" on a receipt, "−" on a send, no sign on a move within the wallet
(a shield, a send to oneself, a migration), in History and in the detail.

**Struck text.** What never happened is struck through (`Text`'s `strike`),
in `fgMuted`: an expired purchase's ZEC in its History row and its detail
hero, and the deposit address nobody should pay anymore. Nothing else.

**Short addresses.** In rows, detail rows, tokens and fields: first 6 … last
6. On Receive's address card: first 10 … last 10. A field that holds an
address stays one line and shortens it in the middle when not focused.

**Large text.** Variants grow with the OS text size up to their cap (body ×2,
titles ×1.5, the balance ×1.3). Layouts wrap instead of clipping: text beside
an icon has `flexShrink: 1`.

## Layout

**Spacing** comes from the scale (4, 8, 12, 16, 20, 24, 32). A value between
steps maps to the nearest one. `space20` is the screen gutter, the left and
right edge of every screen, panel and sheet.

**Touch.** Anything tappable takes at least 44 × 44 (`touchTarget`); a
smaller visible control grows its tap area with `slopFor`, never with
`minHeight`, so it adds no visible space. Minimum heights: button 44, small
button 32, field 48, row 56, chip 32.

**The top of the app.** The top bar (menu, the Nym icon in the middle,
Messages) is the only part of the `Header` that every tab shows. Home adds the
balance block (Total balance with the eye, the amount, fiat, the sync line)
and the notice stack.

**Panels.**
- Home's panel (History) has its stops and can be dragged over the balance.
- Send, Receive and Swap have one fixed stop under the top bar (`PANEL_TOP`).
  Behind them only the top bar is drawn, and the panel is in place on its
  first frame.
- Anything opened in depth (review, sending, sent, the deposit, tracking, a
  result, a transaction or swap detail, Your addresses) is a `FullPanel`: a
  plain screen in the panel's format (`bgSurface`, `bottomSheetBorder`,
  `radiusSheet` top corners, `TitleBar`), at the same top as the tabs' panels,
  over the screen it came from. It is not a bottom sheet: no handle, no drag,
  no snap points. Your addresses sizes to its content.
- Content starts `space8` under the `TitleBar`.
- The `TitleBar` keeps its own inset: 16 from the edge plus each action's 14,
  as History's bar draws it. `space20` is the gutter for the content under it.
- A bottom sheet's content ends `space24` above the navigation bar
  (`insets.bottom + space24`), set once in `AppSheetModal`. A sheet pads its
  own bottom only to clear the keyboard.
- A list in a sheet that sizes to its content is a `SheetScrollView`: the
  sheet opens at the full height of its title, rows and bottom inset, and the
  list scrolls under the fixed title only when that is taller than the screen.

**Menu screens.** What the options panel (the side menu) opens (Settings,
Pools, Server, the seed, the Address Book…) is a full screen on the canvas,
not a panel: one shared header with the logo, the green back arrow and the
title in `barTitle` (16, the same size as every bar title), cards on
`bgSurface` (the contrast rule), sliding in from the right. A screen
that saves (Settings) keeps its Save button fixed at the bottom.

**Pools.** A Total card with the share bar (one segment per pool, in the
pool's own colour, with a legend), then one card per pool: its tile, name,
total, spendable or confirming, and its action (Shield, or the dust note). A
pool always shows with its own colour and its name.

**Lists.** History is a flat list on the panel, no cards: rows of 64 with a
hairline that starts at the text. Month labels scroll with their rows; nothing
is pinned over the list. While a filter is on, its "Showing … · Clear" bar
stays above the list. Lists
of choices (routes, coins, networks, addresses, servers) are `RadioRow`s
inside one `RadioList` card.

**Fields.** One line, `fieldMinHeight` 48, label above in `bodySmall` 600
muted. Actions inside a field (clear, paste, book, scan) are `FieldAction`s:
icon 20 in `fgMuted`, 36 wide on screen with the tap area grown to 44, 4
apart and 4 from the edge. A memo grows to 4 lines, then scrolls inside.

## Elevation & Depth

The interface is flat. Depth comes from the surface step (canvas, surface,
inset), not from shadows or blur.

- Solid fills only: no gradients, no translucent blur behind content. The
  only gradients are the switch's tracks when on (exception D).
- The tab bar is the one floating element: `shadowTabBar`, and the
  `bgScrim` fade under it that `dev` has.
- `bgScrim` veils the screen behind a modal sheet.
- The notice stack on Home is a deck: the front notice in full, the next one
  peeking 12 behind it, "N more" under the deck.

## Shapes

**Radii.** `radiusXs` 4: the checkbox. `radiusSm` 8: tags and icon tiles. `radiusMd` 12: cards, groups of
rows, fields, notices, notes, detail rows, the QR plate. `radiusPill`: buttons,
chips, toggles, avatars, the tab bar and its capsule. `radiusSheet` 28: the top
corners of every panel and sheet. Nothing else.

**Icons.** Drawn on a 24 grid with a visible stroke of 1.75 at every size, in
three sizes: 16 (`iconSizeSm`, inside a line of text), 20 (`iconSizeMd`, in
bars, rows and fields), 24 (`iconSize`, navigation and standalone). Logos
(coins, chains), illustrations and the options panel's artwork (30, in
`fgOptionIcon`) are not icons and keep their own sizes.

- Back is always `ChevronLeft` in `fgAccent`.
- Close is one `XIcon` at 20 in `fgMuted`.
- A status icon takes its role's colour (`fgDanger` for a failure).

**Avatars.** Contacts and the own wallet use `Avatar`: md 36, lg 48, the
category's 12 % tint behind the initial, the chain badge in the corner when it
matters.

## Components

Use the shared component; never build a second one that looks the same.

| For | Use |
|---|---|
| Any text | `Text` with a variant and a tone. `BoldText`, `RegText` and `FadeText` are legacy and leave the screens they are found in |
| Any button | `Button`: `primary` (the one main action of a view), `secondary` (outlined, beside others of the same weight: Copy, Verify), `text` (green: Back, Skip, secondary moves), `quiet` (grey: only Cancel and a Close that leaves a flow), `danger` (the filled confirm of a delete, or of what cannot be undone, in its sheet), `dangerText` (Delete on a screen: the red label with no fill, which opens that sheet), `nym` (only through the mixnet), `viewOnly` (the view-only notice). `small` only inside notices and rows |
| A field | `TextField` with `FieldAction`s. With a prefix and a suffix (the custom server): same measures as every field, `fieldMinHeight` 48, `radiusMd` 12, the value's text variant; the prefix ("https://") and the suffix (":" and the port) in `fgMuted` |
| A card | `Card` (tones `default`, `selected`, pools) |
| Label and value rows | `DetailRows` |
| A list row | `ListRow`; a choice is a `RadioRow` in a `RadioList` |
| A filter | `Chip` (it never navigates) |
| Anything pressed that none of these covers | `Pressable` with its `kind`: `button`, `row`, `icon`, `link` or `tile` (see Motion, Pressing) |
| A delete | `dangerText` "Delete" on the screen; the confirmation sheet titled "Delete", with its own message, a filled `danger` "Delete" and Cancel under it. Every delete says "Delete", on the screen and in the sheet, the same word in every language. The Address Book's red bin opens the same sheet |
| Leaving a sheet | A sheet with an X in its `TitleBar` has no Cancel or Close button: the X closes it, and closing it any way (the X, a swipe, the backdrop) leaves it empty for next time. A sheet with a handle and no X (Shield, Authorize, Delete wallet, Add tag, Contact, every confirmation) keeps Cancel, its only way out. Confirm and the swap review keep the back arrow with Cancel: the arrow steps back, Cancel leaves the flow |
| An on/off setting | `Switch` (exception D), the only toggle in the app |
| A checkbox | `Checkbox`: box 16 × 16 (`iconSizeSm`), radius 4 as `radiusXs` (`radiusSm` 8 would read as a radio at that size), border 1.5 in `borderMuted` when off; `bgAccent` with the tick in `fgOnAccent` when on. The label next to it is part of the tap area, at least 44 high |
| An amount to type | `AmountCard` (exception C) |
| A short status | `Tag` (read, not tapped) |
| A person or the wallet | `Avatar` |
| The bar of a panel or sheet | `TitleBar` |
| Anything opened in depth | `FullPanel` |
| An "i" explanation | `InfoTooltip` |
| Saving an outside address | `SaveContactButton` ("Save contact", `UserPlusIcon` 20, `fgAccent`, centred, 44 tall), opening the Address Book's `ContactSheet` |

**Notices on Home.** The notice stack shows `Banner`s that all share one
background and edge (`bgSurface`, `bottomSheetBorder`), whatever the notice:
transparent funds, seed backup, view-only, Ironwood. Only the content changes:
the icon in its 36 tile, the title (`bodyStrong`), the tag, the body
(`bodySmall` muted) and the action, a `small` button beside the text,
vertically centred. A notice the user can hide has an X: in the card's
top-right corner, outside the row (the view-only notice, whose button is
`viewOnly`), or beside the button (`dismissBeside`) when the card is too short
for a corner X (Ironwood, once only a residual is left in Orchard). Hiding a
notice shows a toast with Undo.

**Toasts.** A plain toast confirms what just happened. A toast with an action
(Undo) is a bar on `bgSurface` with `bottomSheetBorder` and `radiusMd`, the
text in `bodySmall` and the action as a `text` button, and stays long enough
to reach it (4.2 s).

**Forms.** A form's main button stays disabled until the form is ready, and
its label says what is missing ("Not enough ZEC") until it reads its action
("Continue"). The explanation sits next to what is wrong, with a "See why"
link when it needs more room. A working button shows a spinner in its label's
colour.

**Small buttons.** A `small` button sits beside the text of a notice, a note,
a row, a toast or a field, vertically centred, one per card. It is `primary`
only when it is the card's call to act (Shield, Back up); otherwise it is a
`text` button.

**Notes outside Home.** Every warning or info on another screen (Swap, the
deposit, Confirm, Receive, the swap sheets) is a compact note: the icon inline
at 16 with no tile, the text in `caption` regular with no bold, padding 12,
`radiusMd`, in the tone's own colours. Long explanations hide behind a link
("See why"). There is no danger note: errors sit next to what failed.

## Do's and Don'ts

**Do**
- Map every value of a prototype to the nearest token, variant and component.
- Build a rule into the component (the contrast rule, the notice background)
  so a screen cannot get it wrong.
- Keep each kind of text in the same style on every screen.
- Show a contact's name and avatar wherever their address appears, and offer
  "Save contact" wherever an outside address is not in the Address Book.
- Write every new string in the five catalogs.
- Keep the reserved space of text that is invisible for now (Launching's), so
  the logo doesn't jump, but hide it from screen readers while it's invisible
  (`importantForAccessibility="no-hide-descendants"` /
  `accessibilityElementsHidden`), and don't make it `selectable`.

**Don't**
- Don't set `fontSize`, `lineHeight`, `letterSpacing`, `borderRadius`, a
  colour or an icon size by hand.
- Don't change a token's value to match a prototype.
- Don't use `fgPriceUp` as a second green, or `fgTransparent` for a state.
- Don't paint a notice on Home with its tone's fill.
- Don't make a screen opened in depth a draggable bottom sheet.
- Don't bold the text of a note, or pass a whole sentence as a notice title.
- Don't add a second component for something a shared one already draws.

## Motion

Durations and curves live in `app/theme/motion.ts`; nothing hand-times an
animation.

**Pressing.** Everything that reacts to a press reacts one way for its kind,
through the shared `Pressable` and its `kind`, in `duration.fast` (140 ms) on
`ease.standard`, in and out. A disabled control does not react.
- Buttons and pills (every `Button`, small buttons, chips, the unit pill, the
  coin button, the flip button, the round scroll-to-top and scroll-to-bottom
  buttons): scale to 0.97. Their opacity stays.
- Rows and tappable cards (`ListRow`, `RadioRow`, History's rows, swap rows,
  Messages' rows, Server's rows, a tappable `Card`, the pending swap card):
  their background takes `bgMutedSubtle`.
- Icon-only buttons (the `TitleBar`'s and the `Header`'s actions, back
  included, `FieldAction`s, the close X, the eye, an info icon, copy, the
  Address Book's action circles, the options panel's chevron, gear and
  socials, the tab bar's icons): the icon scales to 0.88, never a background.
- The options panel's tiles: the 56 tile scales to 0.94 (`kind="tile"`, the
  tile in a `PressTile`); its label stays still. The cell is the tap target,
  with no background.
- Text links ("Save contact", "See why", "Clear", "Add tag", Available): fade
  to 0.6.
- `TouchableOpacity` is not used: its default fades a control to 0.2.

**Expanding.** A row that opens in place (a contact in the Address Book)
unfolds in `duration.medium` on `ease.emphasized`; its actions fade in
`duration.base` on `ease.standard`, and fold back the same way. What an
action draws after the press (the plane leaving, the pen, the bin's lid)
belongs to that action and keeps the press above.

**One motion at a time.** Opening something moves one thing.
- A tab's panel is in place on its first frame; switching tabs only
  cross-fades the content.
- A full panel rises over the screen it came from, and nothing else moves.
  From a sheet (Your swaps), the panel rises over it and the sheet leaves
  underneath without its own motion.
- Nothing flashes between screens: the screen behind stays drawn until the
  panel covers it.

- Sheets open and close in 420 ms on (.2, 0, 0, 1).
- A full panel rises in 560 ms on (.32, .72, 0, 1) while its content fades
  in, and lowers in 460 ms. Steps inside it (review, sending, sent) only
  cross-fade their content in 150 ms.
- Home's tabs cross-fade their content in 240 ms.
- Menu screens slide in from the right and back out to it: every screen
  the options panel opens and Settings, through one shared option. The panel waits behind them under `bgScrim`, which fades in
  `duration.screen` and out in `duration.sheetClose`.
- Closing a flow lowers only the panel on top; the ones under it leave with
  it.
- A swap waiting for a payment from another wallet: the coin sent breathes
  in place (`duration.breathe`, in and out on `ease.standard`) and nothing
  travels until the provider sees the payment (`SwapFlight`'s `waiting`).
- The tab bar's capsule slides in 360 ms on (.2, 0, 0, 1), its colours change
  in 220 ms, and it shrinks and grows in 360 ms.
- Every animation honours Reduce Motion (`ReduceMotion.System`).

## Exceptions

Approved by the designer. Nothing else departs from the system. There are
five: the tab bar (A), Swap's two cards (B), the amount card (C), the
switch (D) and the brand (E).

**A. The tab bar** is drawn at the prototype's own values:
- 366 wide, 60 tall (icon 28 with 10 above and below), radius 33, padding 5,
  `bgTabBar` with `borderTabBar`, `shadowTabBar`, 22 from the bottom.
- Icons only, no names. Zingo's own marks, drawn from the prototype's SVGs.
- Idle: strokes and leaf `fgTabIdle`, veins `bgTabBar`. Selected: strokes
  `fgTabSelected`, leaf `fgAccent`, veins `bottomSheetBorder`.
- One capsule (`bgTabCapsule`) slides to the selected tab. On press the icon
  scales to 0.88, as every icon-only button (Motion, Pressing).
- Scrolling a tab's list down shrinks the bar to 250 × 50 (padding 4, icons at
  0.86); scrolling up or changing tab brings it back.

**B. Swap's two cards** are the only cards side by side that differ in
colour: "You send" is `bgCanvas`, "You get" is `bgSurface` with the
`bottomSheetBorder` edge. Their sizes follow the system: "You send" in
`balance`, right-aligned; "You get" in `screenTitle`; the flip button 40 with
a 44 tap area, icon 20 in `fgAccent`.

**C. The amount card** keeps its own build instead of `TextField`, on the
system's values: the inset fill, `radiusMd`, padding 16 at the top and sides
and 4 at the bottom, the edge in `borderFocus` when focused and
`borderDanger` when invalid. Inside it:
- the amount in `balance` (36/40), with the unit pill on the right: 32 tall,
  `radiusPill`, a `bottomSheetBorder` edge with no fill, `bodySmall` 700,
  and the swap icon at 16 in `fgMuted`;
- the converted value under it in `bodySmall`, `fgMuted`;
- a `borderSubtle` hairline 8 below, then the row at least 32 tall in
  `caption`: "Available" muted with the amount in 700 and underlined (tap for
  the maximum) on the left, the fee muted on the right.
Send uses it, and Swap's "You send" card follows the same build.

**D. The switch** is one primitive, `Switch`, drawn as Settings draws it
today, and every toggle in the app uses it:
- 40 × 19, fully rounded, with a white thumb of 15 (2 inside the track).
- On: the track is a vertical gradient from the accent green, `bgAccent`
  (#149D05), at the top to `#0A4004` at the bottom, and the thumb sits on the
  right. Settings' current drawing starts at `#23D80F`; the switch starts at
  the accent instead.
- Off: the track is `#7E7E7E`, and the thumb sits on the left.
- The thumb slides and the track changes colour in 200 ms on (.4, 0, .2, 1).
- Its tap area grows to 44 (`slopFor`). It reports its state to
  accessibility as a switch.
- A toggle that acts through the Nym mixnet keeps Nym's own green: the
  `nym` variant draws the on track as a vertical gradient from `#14E76F` at
  the top to `#049959` at the bottom, as `nym-switch-on` does. Every other
  toggle uses the default.
- Its colours are tokens: `bgSwitchOff`, `bgSwitchOnDeep`, `bgSwitchNym`,
  `bgSwitchNymDeep` and `fgSwitchThumb`. It replaced the switch drawings
  in `assets/img` and the one Server drew.

**E. The brand.** StartMenu's 49 pt "Zingo" keeps its size as a named
exception. It is the wordmark, used once, not text.

## Changing the system

1. A screen needs something the system lacks: propose it to the designer.
2. Once approved, add it to `app/theme` or as a variant of the shared
   component, with its story in Storybook, and update this file in the same
   commit.
3. Only then use it on the screen.

CI holds step 2: a PR that changes a value in `app/theme` (tokens, radii,
sizes, spacing, typography, motion) without changing this file fails the
static checks. The `design-md-unchanged` label lets through a change with
nothing visible, such as a comment. The PR template asks the same.

The decision that this file and `app/theme` govern the interface is recorded
in zingo-adrs (`zingo-mobile/0024`). `AGENTS.md` points every UI change here.

**Known gaps.** Screens the redesign has not reached yet (the Header's
internals, the Address Book, the server list, `ChainSelect`, the migration
screens) still hold some hand-set values and legacy text components; they move
onto the system as each is redesigned. Also open:
- `AuthorizeSheet`'s title is `subtitle`; dialog-like sheets use
  `bodyStrong` 700.
- `DetailRows` lives in `screens/Swap/components` but is shared, and belongs
  in `ui/widgets`.
