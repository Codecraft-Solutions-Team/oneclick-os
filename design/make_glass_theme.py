#!/usr/bin/env python3
"""Generates the OneClickGlass Plasma desktop theme (translucent dark navy glass + KWin blur masks).
Run from the repo root; writes into system_files/usr/share/plasma/desktoptheme/OneClickGlass/."""
import json
import os

OUT = "system_files/usr/share/plasma/desktoptheme/OneClickGlass"
GLASS_BG = "#0b1224"
BORDER = "#22304d"


def glass_frame_svg(radius=10, opacity=0.78, margin_x=6, margin_y=6):
    r, c = radius, 32
    mx0, my0 = r + c + r + 16, 0  # mask placed clear to the right of frame
    total_w = mx0 + r + c + r
    total_h = r + c + r
    op = f'fill-opacity="{opacity}"'

    # 9-patch glass frame with 1px crisp border on outer perimeter
    frame_parts = [
        f'<g id="topleft" transform="translate(0,0)">'
        f'<path d="M0,{r} A{r},{r} 0 0 1 {r},0 V{r} Z" fill="{GLASS_BG}" {op}/>'
        f'<path d="M0.5,{r} A{r-0.5},{r-0.5} 0 0 1 {r},0.5" fill="none" stroke="{BORDER}" stroke-width="1"/>'
        f'</g>',
        f'<g id="top" transform="translate({r},0)">'
        f'<rect width="{c}" height="{r}" fill="{GLASS_BG}" {op}/>'
        f'<rect width="{c}" height="1" fill="{BORDER}"/>'
        f'</g>',
        f'<g id="topright" transform="translate({r+c},0)">'
        f'<path d="M0,0 A{r},{r} 0 0 1 {r},{r} H0 Z" fill="{GLASS_BG}" {op}/>'
        f'<path d="M0,0.5 A{r-0.5},{r-0.5} 0 0 1 {r-0.5},{r}" fill="none" stroke="{BORDER}" stroke-width="1"/>'
        f'</g>',
        f'<g id="left" transform="translate(0,{r})">'
        f'<rect width="{r}" height="{c}" fill="{GLASS_BG}" {op}/>'
        f'<rect width="1" height="{c}" fill="{BORDER}"/>'
        f'</g>',
        f'<rect id="center" x="{r}" y="{r}" width="{c}" height="{c}" fill="{GLASS_BG}" {op}/>',
        f'<g id="right" transform="translate({r+c},{r})">'
        f'<rect width="{r}" height="{c}" fill="{GLASS_BG}" {op}/>'
        f'<rect x="{r-1}" width="1" height="{c}" fill="{BORDER}"/>'
        f'</g>',
        f'<g id="bottomleft" transform="translate(0,{r+c})">'
        f'<path d="M{r},{r} A{r},{r} 0 0 1 0,0 H{r} Z" fill="{GLASS_BG}" {op}/>'
        f'<path d="M{r},{r-0.5} A{r-0.5},{r-0.5} 0 0 1 0.5,0" fill="none" stroke="{BORDER}" stroke-width="1"/>'
        f'</g>',
        f'<g id="bottom" transform="translate({r},{r+c})">'
        f'<rect width="{c}" height="{r}" fill="{GLASS_BG}" {op}/>'
        f'<rect y="{r-1}" width="{c}" height="1" fill="{BORDER}"/>'
        f'</g>',
        f'<g id="bottomright" transform="translate({r+c},{r+c})">'
        f'<path d="M0,{r} A{r},{r} 0 0 0 {r},0 H0 Z" fill="{GLASS_BG}" {op}/>'
        f'<path d="M0,{r-0.5} A{r-0.5},{r-0.5} 0 0 0 {r-0.5},0" fill="none" stroke="{BORDER}" stroke-width="1"/>'
        f'</g>',
    ]

    # Margin hints (#ff00ff convention in KSvg)
    cx = r + c // 2 - 2
    cy = r + c // 2 - 2
    hints = [
        f'<rect id="hint-top-margin" x="{cx}" y="0" width="4" height="{margin_y}" fill="#ff00ff"/>',
        f'<rect id="hint-bottom-margin" x="{cx}" y="{total_h - margin_y}" width="4" height="{margin_y}" fill="#ff00ff"/>',
        f'<rect id="hint-left-margin" x="0" y="{cy}" width="{margin_x}" height="4" fill="#ff00ff"/>',
        f'<rect id="hint-right-margin" x="{2*r + c - margin_x}" y="{cy}" width="{margin_x}" height="4" fill="#ff00ff"/>',
    ]

    # KWin blur / window shape mask matching exact rounded rectangle
    mask_parts = [
        f'<path id="mask-topleft" transform="translate({mx0},{my0})" d="M0,{r} A{r},{r} 0 0 1 {r},0 V{r} Z" fill="#000000"/>',
        f'<rect id="mask-top" x="{mx0+r}" y="{my0}" width="{c}" height="{r}" fill="#000000"/>',
        f'<path id="mask-topright" transform="translate({mx0+r+c},{my0})" d="M0,0 A{r},{r} 0 0 1 {r},{r} H0 Z" fill="#000000"/>',
        f'<rect id="mask-left" x="{mx0}" y="{my0+r}" width="{r}" height="{c}" fill="#000000"/>',
        f'<rect id="mask-center" x="{mx0+r}" y="{my0+r}" width="{c}" height="{c}" fill="#000000"/>',
        f'<rect id="mask-right" x="{mx0+r+c}" y="{my0+r}" width="{r}" height="{c}" fill="#000000"/>',
        f'<path id="mask-bottomleft" transform="translate({mx0},{my0+r+c})" d="M{r},{r} A{r},{r} 0 0 1 0,0 H{r} Z" fill="#000000"/>',
        f'<rect id="mask-bottom" x="{mx0+r}" y="{my0+r+c}" width="{c}" height="{r}" fill="#000000"/>',
        f'<path id="mask-bottomright" transform="translate({mx0+r+c},{my0+r+c})" d="M0,{r} A{r},{r} 0 0 0 {r},0 H0 Z" fill="#000000"/>',
    ]

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_w}" height="{total_h}" '
        f'viewBox="0 0 {total_w} {total_h}">'
        + "".join(frame_parts + hints + mask_parts)
        + "</svg>\n"
    )


COLORS = """[ColorEffects:Disabled]
Color=56,56,56
ColorAmount=0
ColorEffect=0
ContrastAmount=0.65
ContrastEffect=1
IntensityAmount=0.1
IntensityEffect=2

[ColorEffects:Inactive]
ChangeSelectionColor=true
Color=112,111,110
ColorAmount=0.025
ColorEffect=2
ContrastAmount=0.1
ContrastEffect=2
Enable=false
IntensityAmount=0
IntensityEffect=0

[Colors:Button]
BackgroundAlternate=34,48,77
BackgroundNormal=17,27,51
DecorationFocus=45,212,191
DecorationHover=45,212,191
ForegroundActive=45,212,191
ForegroundInactive=148,163,184
ForegroundLink=45,212,191
ForegroundNegative=239,68,68
ForegroundNeutral=245,158,11
ForegroundNormal=255,255,255
ForegroundPositive=40,200,64
ForegroundVisited=167,139,250

[Colors:Complementary]
BackgroundAlternate=17,27,51
BackgroundNormal=11,18,36
DecorationFocus=45,212,191
DecorationHover=45,212,191
ForegroundActive=45,212,191
ForegroundInactive=148,163,184
ForegroundLink=45,212,191
ForegroundNegative=239,68,68
ForegroundNeutral=245,158,11
ForegroundNormal=255,255,255
ForegroundPositive=40,200,64
ForegroundVisited=167,139,250

[Colors:Header]
BackgroundAlternate=11,18,36
BackgroundNormal=17,27,51
DecorationFocus=45,212,191
DecorationHover=45,212,191
ForegroundActive=45,212,191
ForegroundInactive=148,163,184
ForegroundLink=45,212,191
ForegroundNegative=239,68,68
ForegroundNeutral=245,158,11
ForegroundNormal=255,255,255
ForegroundPositive=40,200,64
ForegroundVisited=167,139,250

[Colors:Header][Inactive]
BackgroundAlternate=17,27,51
BackgroundNormal=11,18,36
DecorationFocus=45,212,191
DecorationHover=45,212,191
ForegroundActive=45,212,191
ForegroundInactive=148,163,184
ForegroundLink=45,212,191
ForegroundNegative=239,68,68
ForegroundNeutral=245,158,11
ForegroundNormal=255,255,255
ForegroundPositive=40,200,64
ForegroundVisited=167,139,250

[Colors:Selection]
BackgroundAlternate=15,118,110
BackgroundNormal=45,212,191
DecorationFocus=45,212,191
DecorationHover=45,212,191
ForegroundActive=255,255,255
ForegroundInactive=148,163,184
ForegroundLink=45,212,191
ForegroundNegative=239,68,68
ForegroundNeutral=245,158,11
ForegroundNormal=4,47,46
ForegroundPositive=40,200,64
ForegroundVisited=167,139,250

[Colors:Tooltip]
BackgroundAlternate=10,16,32
BackgroundNormal=11,18,36
DecorationFocus=45,212,191
DecorationHover=45,212,191
ForegroundActive=45,212,191
ForegroundInactive=148,163,184
ForegroundLink=45,212,191
ForegroundNegative=239,68,68
ForegroundNeutral=245,158,11
ForegroundNormal=255,255,255
ForegroundPositive=40,200,64
ForegroundVisited=167,139,250

[Colors:View]
BackgroundAlternate=17,27,51
BackgroundNormal=10,16,32
DecorationFocus=45,212,191
DecorationHover=45,212,191
ForegroundActive=45,212,191
ForegroundInactive=148,163,184
ForegroundLink=45,212,191
ForegroundNegative=239,68,68
ForegroundNeutral=245,158,11
ForegroundNormal=255,255,255
ForegroundPositive=40,200,64
ForegroundVisited=167,139,250

[Colors:Window]
BackgroundAlternate=17,27,51
BackgroundNormal=11,18,36
DecorationFocus=45,212,191
DecorationHover=45,212,191
ForegroundActive=45,212,191
ForegroundInactive=148,163,184
ForegroundLink=45,212,191
ForegroundNegative=239,68,68
ForegroundNeutral=245,158,11
ForegroundNormal=255,255,255
ForegroundPositive=40,200,64
ForegroundVisited=167,139,250

[General]
ColorScheme=OneClickGlass
Name=OneClick Glass
shadeSortColumn=true

[KDE]
contrast=4

[WM]
activeBackground=11,18,36
activeBlend=255,255,255
activeForeground=255,255,255
inactiveBackground=10,16,32
inactiveBlend=148,163,184
inactiveForeground=148,163,184
"""

PLASMARC = """[Settings]
FallbackTheme=breeze-dark

[Wallpaper]
defaultWallpaperTheme=OneClick
defaultFileSuffix=.png
defaultWidth=1920
defaultHeight=1080

[AdaptiveTransparency]
enabled=true

[ContrastEffect]
enabled=true
contrast=0.20
intensity=0.90
saturation=1.25
"""

METADATA = {
    "KPlugin": {
        "Authors": [{"Name": "OneClick OS"}],
        "Category": "",
        "Description": "Translucent dark glass theme with blurred panels and popups for OneClick OS",
        "EnabledByDefault": True,
        "Id": "OneClickGlass",
        "License": "Apache-2.0",
        "Name": "OneClick Glass",
        "Version": "0.1",
        "Website": "https://github.com/Codecraft-Solutions-Team/oneclick-os",
    },
    "X-Plasma-API": "5.0",
}

for sub in ("dialogs", "widgets", "translucent/dialogs", "translucent/widgets"):
    os.makedirs(f"{OUT}/{sub}", exist_ok=True)

with open(f"{OUT}/metadata.json", "w") as f:
    json.dump(METADATA, f, indent=4)
    f.write("\n")
with open(f"{OUT}/plasmarc", "w") as f:
    f.write(PLASMARC)
with open(f"{OUT}/colors", "w") as f:
    f.write(COLORS)

panel_svg = glass_frame_svg(radius=14, opacity=0.76, margin_x=6, margin_y=2)
dialog_svg = glass_frame_svg(radius=10, opacity=0.80, margin_x=6, margin_y=6)
tooltip_svg = glass_frame_svg(radius=8, opacity=0.82, margin_x=6, margin_y=5)

for p in ("widgets/panel-background.svg", "translucent/widgets/panel-background.svg"):
    with open(f"{OUT}/{p}", "w") as f:
        f.write(panel_svg)

for p in (
    "dialogs/background.svg",
    "translucent/dialogs/background.svg",
    "widgets/background.svg",
    "translucent/widgets/background.svg",
):
    with open(f"{OUT}/{p}", "w") as f:
        f.write(dialog_svg)

for p in ("widgets/tooltip.svg", "translucent/widgets/tooltip.svg"):
    with open(f"{OUT}/{p}", "w") as f:
        f.write(tooltip_svg)

print("wrote OneClickGlass theme")
