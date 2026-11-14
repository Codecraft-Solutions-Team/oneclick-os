#!/usr/bin/env python3
"""Draws the OneClickMac window frame: flat dark navy title bar with circle buttons on the left.
Run from the repo root; writes into system_files/usr/share/aurorae/themes/OneClickMac/."""
import os

OUT = "system_files/usr/share/aurorae/themes/OneClickMac"
W, H = 20, 34
BAR, BAR_INACTIVE, EDGE = "#0b1224", "#0d1528", "#22304d"
INACTIVE_DOT = "#334155"

COLORS = {
    "close": ("#ff5f57", "#e0483f", "#4d0000"),
    "minimize": ("#febc2e", "#df9f17", "#663d00"),
    "maximize": ("#28c840", "#1ea933", "#004d0d"),
    "restore": ("#28c840", "#1ea933", "#004d0d"),
}


def glyph(kind, color):
    cx, cy = W / 2, H / 2
    stroke = f'stroke="{color}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"'
    if kind == "close":
        d = 2.6
        return f'<path d="M{cx-d} {cy-d} L{cx+d} {cy+d} M{cx+d} {cy-d} L{cx-d} {cy+d}" {stroke}/>'
    if kind == "minimize":
        d = 3.2
        return f'<path d="M{cx-d} {cy} H{cx+d}" {stroke}/>'
    if kind == "maximize":
        d = 3.0
        return f'<path d="M{cx-d} {cy} H{cx+d} M{cx} {cy-d} V{cy+d}" {stroke}/>'
    if kind == "restore":
        d = 2.8
        return (
            f'<path d="M{cx-d} {cy-0.8} H{cx-0.8} V{cy-d} '
            f'M{cx+d} {cy+0.8} H{cx+0.8} V{cy+d}" {stroke}/>'
        )
    return ""


def button(kind):
    normal, pressed, sym_color = COLORS[kind]
    cx, cy, r = W / 2, H / 2, 6
    states = [
        ("active", normal, 1.0, False),
        ("inactive", INACTIVE_DOT, 1.0, False),
        ("hover", normal, 1.0, True),
        ("hover-inactive", normal, 1.0, True),
        ("pressed", pressed, 1.0, True),
        ("pressed-inactive", pressed, 1.0, True),
        ("deactivated", INACTIVE_DOT, 0.45, False),
        ("deactivated-inactive", INACTIVE_DOT, 0.45, False),
    ]
    step = W + 4
    parts = []
    for i, (sid, fill, opacity, show_glyph) in enumerate(states):
        inner = (
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" fill-opacity="{opacity}"/>'
            + (glyph(kind, sym_color) if show_glyph else "")
        )
        parts.append(f'<g id="{sid}-center" transform="translate({i*step},0)">{inner}</g>')
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{len(states)*step}" height="{H}">'
        + "".join(parts)
        + "</svg>\n"
    )


def frame():
    def rounded_nine(prefix, fill, opacity, x0):
        r, c, b = 10, 20, 1  # top corner radius, center size, bottom edge thickness
        op = f' fill-opacity="{opacity}"' if opacity < 1.0 else ""
        # Top-left rounded piece (10x10) with 1px outer border along top/left arc
        tl_fill = f'<path d="M0,{r} A{r},{r} 0 0 1 {r},0 H{r} V{r} Z" fill="{fill}"{op}/>'
        tl_edge = f'<path d="M0.5,{r} A{r-0.5},{r-0.5} 0 0 1 {r},0.5" fill="none" stroke="{EDGE}" stroke-width="1"/>'
        tr_fill = f'<path d="M0,0 A{r},{r} 0 0 1 {r},{r} H0 Z" fill="{fill}"{op}/>'
        tr_edge = f'<path d="M0,0.5 A{r-0.5},{r-0.5} 0 0 1 {r-0.5},{r}" fill="none" stroke="{EDGE}" stroke-width="1"/>'
        return "".join([
            f'<g id="{prefix}-topleft" transform="translate({x0},0)">{tl_fill}{tl_edge}</g>',
            f'<g id="{prefix}-top" transform="translate({x0+r},0)">'
            f'<rect width="{c}" height="{r}" fill="{fill}"{op}/>'
            f'<rect width="{c}" height="1" fill="{EDGE}"/></g>',
            f'<g id="{prefix}-topright" transform="translate({x0+r+c},0)">{tr_fill}{tr_edge}</g>',
            f'<g id="{prefix}-left" transform="translate({x0},{r})">'
            f'<rect width="{r}" height="{c}" fill="{fill}"{op}/>'
            f'<rect width="1" height="{c}" fill="{EDGE}"/></g>',
            f'<rect id="{prefix}-center" x="{x0+r}" y="{r}" width="{c}" height="{c}" fill="{fill}"{op}/>',
            f'<g id="{prefix}-right" transform="translate({x0+r+c},{r})">'
            f'<rect width="{r}" height="{c}" fill="{fill}"{op}/>'
            f'<rect x="{r-1}" width="1" height="{c}" fill="{EDGE}"/></g>',
            f'<rect id="{prefix}-bottomleft" x="{x0}" y="{r+c}" width="{r}" height="{b}" fill="{EDGE}"/>',
            f'<rect id="{prefix}-bottom" x="{x0+r}" y="{r+c}" width="{c}" height="{b}" fill="{EDGE}"/>',
            f'<rect id="{prefix}-bottomright" x="{x0+r+c}" y="{r+c}" width="{r}" height="{b}" fill="{EDGE}"/>',
        ])

    def flat_nine(prefix, fill, x0):
        b, c = 1, 20
        el = lambda name, x, y, w, h, col: f'<rect id="{prefix}-{name}" x="{x0+x}" y="{y}" width="{w}" height="{h}" fill="{col}"/>'
        return "".join([
            el("topleft", 0, 0, b, b, fill), el("top", b, 0, c, b, fill), el("topright", b + c, 0, b, b, fill),
            el("left", 0, b, b, c, fill), el("center", b, b, c, c, fill), el("right", b + c, b, b, c, fill),
            el("bottomleft", 0, b + c, b, b, EDGE), el("bottom", b, b + c, c, b, EDGE), el("bottomright", b + c, b + c, b, b, EDGE),
        ])

    def mask_nine(x0):
        r, c, b = 10, 20, 1
        return "".join([
            f'<path id="mask-topleft" transform="translate({x0},0)" d="M0,{r} A{r},{r} 0 0 1 {r},0 V{r} Z" fill="#000000"/>',
            f'<rect id="mask-top" x="{x0+r}" y="0" width="{c}" height="{r}" fill="#000000"/>',
            f'<path id="mask-topright" transform="translate({x0+r+c},0)" d="M0,0 A{r},{r} 0 0 1 {r},{r} H0 Z" fill="#000000"/>',
            f'<rect id="mask-left" x="{x0}" y="{r}" width="{r}" height="{c}" fill="#000000"/>',
            f'<rect id="mask-center" x="{x0+r}" y="{r}" width="{c}" height="{c}" fill="#000000"/>',
            f'<rect id="mask-right" x="{x0+r+c}" y="{r}" width="{r}" height="{c}" fill="#000000"/>',
            f'<rect id="mask-bottomleft" x="{x0}" y="{r+c}" width="{r}" height="{b}" fill="#000000"/>',
            f'<rect id="mask-bottom" x="{x0+r}" y="{r+c}" width="{c}" height="{b}" fill="#000000"/>',
            f'<rect id="mask-bottomright" x="{x0+r+c}" y="{r+c}" width="{r}" height="{b}" fill="#000000"/>',
        ])

    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="40">'
        + rounded_nine("decoration", BAR, 0.92, 0)
        + rounded_nine("decoration-inactive", BAR_INACTIVE, 0.90, 50)
        + flat_nine("decoration-maximized", BAR, 100)
        + flat_nine("decoration-maximized-inactive", BAR_INACTIVE, 130)
        + mask_nine(170)
        + "</svg>\n"
    )


os.makedirs(OUT, exist_ok=True)
for k in ("minimize", "maximize", "restore", "close"):
    with open(f"{OUT}/{k}.svg", "w") as f:
        f.write(button(k))
with open(f"{OUT}/decoration.svg", "w") as f:
    f.write(frame())
with open(f"{OUT}/OneClickMacrc", "w") as f:
    f.write(f"""[General]
ActiveTextColor=255,255,255,255
InactiveTextColor=124,138,165,255
UseTextShadow=false
TitleAlignment=Center
TitleVerticalAlignment=Center
Animation=100
ActiveFontBold=false
Shadow=true

[Layout]
BorderLeft=1
BorderRight=1
BorderBottom=1
TitleEdgeTop=1
TitleEdgeBottom=0
TitleEdgeLeft=10
TitleEdgeRight=10
TitleEdgeTopMaximized=0
TitleEdgeBottomMaximized=0
TitleEdgeLeftMaximized=10
TitleEdgeRightMaximized=10
TitleBorderLeft=8
TitleBorderRight=8
TitleHeight={H}
ButtonWidth={W}
ButtonHeight={H}
ButtonSpacing=6
ButtonMarginTop=0
ExplicitButtonSpacer=8
PaddingTop=0
PaddingBottom=0
PaddingLeft=0
PaddingRight=0
""")
with open(f"{OUT}/metadata.desktop", "w") as f:
    f.write("""[Desktop Entry]
Name=OneClickMac
Comment=Flat dark title bar with centered title and left circle window buttons
X-KDE-PluginInfo-Name=OneClickMac
X-KDE-PluginInfo-Version=0.1
X-KDE-PluginInfo-License=Apache-2.0
X-KDE-PluginInfo-EnabledByDefault=true
""")
print("wrote", sorted(os.listdir(OUT)))
