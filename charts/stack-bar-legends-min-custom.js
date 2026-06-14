/* =======================================================================
 * Stack Bar Legends — HIGHCHARTS NATIVE LEGEND version
 *
 * GOAL: Replicate the grouped legend (group headers, member swatches,
 *       "|" dividers, hover-dim, click-toggle) using Highcharts'
 *       own legend engine — no DOM built outside the chart.
 *
 * ── HIGHCHARTS OPTIONS & APIs used ──────────────────────────────────
 *
 *  legend.enabled: true           Turns on Highcharts' legend engine
 *  legend.useHTML: true           Legend item labels become real HTML
 *  legend.labelFormatter          Callback → returns HTML string per item
 *  legend.alignColumns: false     Inline flow (no grid) — items wrap like text
 *  legend.maxHeight               Caps legend box → triggers pagination arrows
 *  legend.navigation              Pagination arrow config (color, size, style)
 *  legend.symbolWidth/Height: 0   Suppresses the auto SVG symbol so our
 *                                 HTML label is the sole visual indicator
 *  legend.symbolPadding: 0        Removes gap between (now-invisible)
 *                                 symbol slot and label text
 *  plotOptions.series.states
 *    .inactive.opacity            Highcharts controls the dim level
 *                                 when a series is in "inactive" state
 *  series.events.legendItemClick  Fires before default toggle; returning
 *                                 false cancels default (used on dummy
 *                                 group-header and divider series)
 *  chart.events.render            Lifecycle hook; fires after every
 *                                 redraw — used to override setState on
 *                                 group-header dummy series
 *  series.setState('inactive'|'') PUBLIC API — dims / restores a series
 *  chart.get(id)                  PUBLIC API — looks up series by id
 *  series.show() / series.hide()  PUBLIC API — visibility toggle
 *
 * ── CUSTOM (minimal) ────────────────────────────────────────────────
 *
 *  Inside chart.events.render (group headers ONLY):
 *    • Individual series hover-dim is handled natively by Highcharts
 *    • Group headers are dummy series (data:[]) — Highcharts' built-in
 *      hover would dim everything except the empty dummy, which is wrong.
 *      We override setState on group headers to redirect to their member
 *      series — Highcharts' native legend hover triggers the override.
 *
 *  labelFormatter HTML strings (the colored square/line/icon/divider
 *  visuals are inline HTML returned from a Highcharts callback)
 *
 *  Dummy series (data: []) used as group headers and dividers —
 *  a documented Highcharts pattern; events.legendItemClick returns false
 *  on these to prevent default show/hide behavior
 *
 * ── KNOWN ISSUES / QUESTIONS FOR HIGHCHARTS SUPPORT ─────────────────
 *
 *  1. alignColumns:false + maxHeight pagination:
 *     With alignColumns:false, Highcharts' internal height measurement
 *     for the legend doesn't reliably produce an exact N-row cutoff.
 *     maxHeight values don't map predictably to visible rows — sometimes
 *     1 row shows when 2 are expected, or a 3rd row is half-clipped.
 *     QUESTION: Is there a way to get row-exact pagination with
 *     alignColumns:false + useHTML:true?
 *
 *  2. Uneven itemDistance after group headers:
 *     itemDistance applies uniformly to all legend items, but visually
 *     the gap after a group-header item appears wider than between
 *     member items. Possibly due to useHTML item width calculation
 *     adding internal padding. Negative margin on labelFormatter HTML
 *     clips the label text.
 *     QUESTION: Is there per-item spacing control, or a way to reduce
 *     the gap specifically after group-header legend items?
 *
 *  3. Combined group headers for shared members (FUTURE):
 *     If two stacked groups share the same member names (e.g., both
 *     "Forecast" and "Fulfillment" have Supplier_A..O), we want ONE
 *     legend entry per member controlling BOTH stacks. Display:
 *       "Group_A / Group_B: ■ Member1 ■ Member2 ..."
 *     linkedTo hides the series from legend entirely — we need them
 *     individually addressable in the chart but sharing a legend entry.
 *     QUESTION: Is there a native pattern for one legend item
 *     controlling multiple series across different stacks?
 *
 * ======================================================================= */

function initMemberStackedLegendHCChart() {
    /* ── DATA ─────────────────────────────────────────────────────── */

    const MONTHS = [
        "M01-2026",
        "M02-2026",
        "M03-2026",
        "M04-2026",
        "M05-2026",
        "M06-2026",
        "M07-2026",
        "M08-2026",
        "M09-2026",
        "M10-2026",
        "M11-2026",
        "M12-2026",
        "M13-2026",
    ];

    const GROUPS = [
        {
            id: "product1",
            label: "Product-1",
            members: [
                {
                    id: "item_1a",
                    name: "Item-1",
                    color: "#FFC107",
                    data: [
                        82, 98, 76, 66, 104, 93, 82, 87, 102, 112, 91, 80, 87,
                    ],
                },
                {
                    id: "item_2a",
                    name: "Item-2",
                    color: "#FFD54F",
                    data: [72, 84, 68, 62, 88, 78, 72, 74, 88, 98, 80, 70, 74],
                },
                {
                    id: "item_3a",
                    name: "Item-3",
                    color: "#F9A825",
                    data: [66, 72, 62, 56, 78, 72, 67, 70, 80, 88, 74, 65, 70],
                },
                {
                    id: "item_4a",
                    name: "Item-4",
                    color: "#E07B28",
                    data: [60, 66, 56, 50, 72, 66, 61, 64, 74, 82, 67, 59, 64],
                },
                {
                    id: "item_5a",
                    name: "Item-5",
                    color: "#EF6C00",
                    data: [55, 61, 51, 46, 66, 61, 56, 59, 69, 76, 62, 54, 59],
                },
                {
                    id: "item_6a",
                    name: "Item-6",
                    color: "#D84315",
                    data: [50, 57, 47, 42, 61, 56, 51, 54, 64, 70, 57, 50, 54],
                },
                {
                    id: "item_7a",
                    name: "Item-7",
                    color: "#BF360C",
                    data: [46, 53, 43, 39, 57, 52, 48, 50, 60, 66, 53, 47, 50],
                },
                {
                    id: "item_8a",
                    name: "Item-8",
                    color: "#8B5E2E",
                    data: [43, 49, 40, 36, 53, 49, 44, 47, 56, 62, 50, 44, 47],
                },
                {
                    id: "item_9a",
                    name: "Item-9",
                    color: "#A1887F",
                    data: [40, 46, 37, 33, 50, 45, 41, 44, 52, 58, 47, 41, 44],
                },
                {
                    id: "item_10a",
                    name: "Item-10",
                    color: "#795548",
                    data: [37, 43, 35, 30, 47, 42, 38, 41, 49, 54, 44, 38, 41],
                },
                {
                    id: "item_11a",
                    name: "Item-11",
                    color: "#6D4C41",
                    data: [35, 40, 32, 28, 44, 39, 35, 38, 46, 51, 41, 36, 38],
                },
                {
                    id: "item_12a",
                    name: "Item-12",
                    color: "#5D4037",
                    data: [32, 37, 30, 26, 41, 37, 33, 35, 43, 48, 38, 33, 35],
                },
                {
                    id: "item_13a",
                    name: "Item-13",
                    color: "#5A3010",
                    data: [30, 35, 28, 24, 38, 34, 30, 33, 40, 45, 36, 31, 33],
                },
                {
                    id: "item_14a",
                    name: "Item-14",
                    color: "#3E2723",
                    data: [28, 32, 26, 22, 36, 32, 28, 30, 37, 42, 33, 29, 30],
                },
                {
                    id: "item_15a",
                    name: "Item-15",
                    color: "#2E1408",
                    data: [25, 30, 24, 20, 33, 29, 25, 28, 35, 39, 31, 26, 28],
                },
                {
                    id: "item_16a",
                    name: "Item-16",
                    color: "#FF8F00",
                    data: [23, 28, 22, 18, 31, 27, 23, 26, 33, 37, 29, 24, 26],
                },
                {
                    id: "item_17a",
                    name: "Item-17",
                    color: "#F57F17",
                    data: [21, 26, 20, 17, 29, 25, 21, 24, 31, 35, 27, 22, 24],
                },
                {
                    id: "item_18a",
                    name: "Item-18",
                    color: "#E65100",
                    data: [19, 24, 18, 15, 27, 23, 19, 22, 29, 33, 25, 20, 22],
                },
                {
                    id: "item_19a",
                    name: "Item-19",
                    color: "#DD2C00",
                    data: [17, 22, 16, 14, 25, 21, 17, 20, 27, 31, 23, 18, 20],
                },
                {
                    id: "item_20a",
                    name: "Item-20",
                    color: "#BF360C",
                    data: [15, 20, 15, 12, 23, 19, 15, 18, 25, 29, 21, 16, 18],
                },
                {
                    id: "item_21a",
                    name: "Item-21",
                    color: "#8D6E63",
                    data: [14, 18, 13, 11, 21, 17, 14, 16, 23, 27, 19, 15, 16],
                },
                {
                    id: "item_22a",
                    name: "Item-22",
                    color: "#6D4C41",
                    data: [12, 16, 12, 10, 19, 16, 12, 14, 21, 25, 17, 13, 15],
                },
                {
                    id: "item_23a",
                    name: "Item-23",
                    color: "#4E342E",
                    data: [11, 15, 11, 9, 17, 14, 11, 13, 19, 23, 16, 12, 13],
                },
                {
                    id: "item_24a",
                    name: "Item-24",
                    color: "#3E2723",
                    data: [10, 13, 10, 8, 16, 13, 10, 11, 18, 21, 14, 10, 12],
                },
                {
                    id: "item_25a",
                    name: "Item-25",
                    color: "#1B0000",
                    data: [9, 12, 9, 7, 14, 11, 9, 10, 16, 19, 13, 9, 10],
                },
            ],
        },
        {
            id: "product2",
            label: "Product-2",
            members: [
                {
                    id: "item_1b",
                    name: "Item-1",
                    color: "#FFC107",
                    data: [78, 82, 72, 67, 88, 80, 74, 77, 90, 98, 82, 74, 78],
                },
                {
                    id: "item_2b",
                    name: "Item-2",
                    color: "#FFD54F",
                    data: [68, 74, 64, 60, 78, 70, 65, 68, 80, 88, 72, 65, 69],
                },
                {
                    id: "item_3b",
                    name: "Item-3",
                    color: "#F9A825",
                    data: [62, 67, 60, 54, 72, 65, 60, 63, 73, 80, 67, 60, 64],
                },
                {
                    id: "item_4b",
                    name: "Item-4",
                    color: "#E07B28",
                    data: [57, 62, 54, 49, 67, 60, 55, 58, 68, 74, 62, 55, 59],
                },
                {
                    id: "item_5b",
                    name: "Item-5",
                    color: "#EF6C00",
                    data: [52, 57, 50, 45, 62, 55, 50, 53, 63, 68, 57, 50, 54],
                },
                {
                    id: "item_6b",
                    name: "Item-6",
                    color: "#D84315",
                    data: [48, 53, 46, 42, 58, 52, 47, 50, 59, 64, 53, 47, 50],
                },
                {
                    id: "item_7b",
                    name: "Item-7",
                    color: "#BF360C",
                    data: [45, 50, 43, 39, 55, 49, 44, 47, 56, 61, 50, 44, 47],
                },
                {
                    id: "item_8b",
                    name: "Item-8",
                    color: "#8B5E2E",
                    data: [42, 47, 40, 36, 52, 46, 41, 44, 53, 58, 47, 41, 44],
                },
                {
                    id: "item_9b",
                    name: "Item-9",
                    color: "#A1887F",
                    data: [39, 44, 37, 34, 49, 43, 38, 41, 50, 55, 44, 38, 41],
                },
                {
                    id: "item_10b",
                    name: "Item-10",
                    color: "#795548",
                    data: [36, 41, 35, 31, 46, 41, 36, 38, 47, 52, 41, 36, 38],
                },
                {
                    id: "item_11b",
                    name: "Item-11",
                    color: "#6D4C41",
                    data: [34, 38, 32, 29, 43, 38, 33, 36, 44, 49, 39, 33, 36],
                },
                {
                    id: "item_12b",
                    name: "Item-12",
                    color: "#5D4037",
                    data: [31, 36, 30, 27, 40, 36, 31, 33, 42, 46, 36, 31, 33],
                },
                {
                    id: "item_13b",
                    name: "Item-13",
                    color: "#5A3010",
                    data: [29, 33, 28, 25, 38, 33, 29, 31, 39, 43, 34, 29, 31],
                },
                {
                    id: "item_14b",
                    name: "Item-14",
                    color: "#3E2723",
                    data: [27, 31, 26, 23, 35, 31, 27, 29, 37, 41, 32, 27, 29],
                },
                {
                    id: "item_15b",
                    name: "Item-15",
                    color: "#2E1408",
                    data: [25, 28, 24, 21, 33, 29, 25, 27, 34, 38, 29, 25, 27],
                },
                {
                    id: "item_16b",
                    name: "Item-16",
                    color: "#FF8F00",
                    data: [23, 26, 22, 19, 31, 27, 23, 25, 32, 36, 27, 23, 25],
                },
                {
                    id: "item_17b",
                    name: "Item-17",
                    color: "#F57F17",
                    data: [21, 24, 20, 17, 29, 25, 21, 23, 30, 34, 25, 21, 23],
                },
                {
                    id: "item_18b",
                    name: "Item-18",
                    color: "#E65100",
                    data: [19, 22, 18, 16, 27, 23, 19, 21, 28, 32, 23, 19, 21],
                },
                {
                    id: "item_19b",
                    name: "Item-19",
                    color: "#DD2C00",
                    data: [17, 20, 17, 14, 25, 21, 17, 19, 26, 30, 21, 17, 19],
                },
                {
                    id: "item_20b",
                    name: "Item-20",
                    color: "#BF360C",
                    data: [15, 18, 15, 12, 23, 19, 15, 17, 24, 28, 19, 15, 17],
                },
                {
                    id: "item_21b",
                    name: "Item-21",
                    color: "#8D6E63",
                    data: [14, 17, 14, 11, 21, 18, 14, 16, 22, 26, 18, 14, 16],
                },
                {
                    id: "item_22b",
                    name: "Item-22",
                    color: "#6D4C41",
                    data: [12, 15, 12, 10, 19, 16, 12, 14, 20, 24, 16, 12, 14],
                },
                {
                    id: "item_23b",
                    name: "Item-23",
                    color: "#4E342E",
                    data: [11, 14, 11, 9, 17, 14, 11, 13, 18, 22, 15, 11, 13],
                },
                {
                    id: "item_24b",
                    name: "Item-24",
                    color: "#3E2723",
                    data: [10, 12, 10, 8, 16, 13, 10, 11, 17, 20, 13, 10, 11],
                },
                {
                    id: "item_25b",
                    name: "Item-25",
                    color: "#1B0000",
                    data: [9, 11, 9, 7, 14, 11, 9, 10, 15, 18, 12, 9, 10],
                },
            ],
        },
        {
            id: "product3",
            label: "Product-3",
            members: [
                {
                    id: "item_1c",
                    name: "Item-1",
                    color: "#FFC107",
                    data: [62, 70, 57, 52, 74, 67, 60, 64, 74, 82, 70, 62, 66],
                },
                {
                    id: "item_2c",
                    name: "Item-2",
                    color: "#FFD54F",
                    data: [54, 60, 50, 46, 64, 58, 52, 55, 65, 72, 60, 54, 58],
                },
                {
                    id: "item_3c",
                    name: "Item-3",
                    color: "#F9A825",
                    data: [50, 55, 46, 42, 59, 53, 48, 51, 60, 67, 55, 49, 53],
                },
                {
                    id: "item_4c",
                    name: "Item-4",
                    color: "#E07B28",
                    data: [46, 50, 42, 38, 54, 48, 44, 46, 55, 61, 50, 45, 48],
                },
                {
                    id: "item_5c",
                    name: "Item-5",
                    color: "#EF6C00",
                    data: [42, 46, 38, 34, 49, 44, 40, 42, 50, 56, 45, 40, 44],
                },
                {
                    id: "item_6c",
                    name: "Item-6",
                    color: "#D84315",
                    data: [39, 43, 35, 31, 46, 41, 37, 39, 47, 53, 42, 38, 41],
                },
                {
                    id: "item_7c",
                    name: "Item-7",
                    color: "#BF360C",
                    data: [36, 40, 33, 29, 43, 38, 34, 36, 44, 50, 40, 35, 38],
                },
                {
                    id: "item_8c",
                    name: "Item-8",
                    color: "#8B5E2E",
                    data: [34, 37, 31, 27, 40, 36, 32, 34, 41, 47, 37, 33, 35],
                },
                {
                    id: "item_9c",
                    name: "Item-9",
                    color: "#A1887F",
                    data: [31, 35, 28, 25, 38, 33, 29, 31, 39, 44, 35, 30, 33],
                },
                {
                    id: "item_10c",
                    name: "Item-10",
                    color: "#795548",
                    data: [29, 32, 26, 23, 35, 31, 27, 29, 36, 41, 32, 28, 30],
                },
                {
                    id: "item_11c",
                    name: "Item-11",
                    color: "#6D4C41",
                    data: [27, 30, 24, 21, 33, 29, 25, 27, 34, 38, 30, 26, 28],
                },
                {
                    id: "item_12c",
                    name: "Item-12",
                    color: "#5D4037",
                    data: [25, 28, 22, 19, 30, 27, 23, 25, 31, 36, 28, 24, 26],
                },
                {
                    id: "item_13c",
                    name: "Item-13",
                    color: "#5A3010",
                    data: [23, 26, 20, 18, 28, 25, 21, 23, 29, 33, 26, 22, 24],
                },
                {
                    id: "item_14c",
                    name: "Item-14",
                    color: "#3E2723",
                    data: [21, 24, 19, 16, 26, 23, 19, 21, 27, 31, 24, 20, 22],
                },
                {
                    id: "item_15c",
                    name: "Item-15",
                    color: "#2E1408",
                    data: [19, 22, 17, 14, 24, 21, 18, 19, 25, 28, 22, 19, 20],
                },
                {
                    id: "item_16c",
                    name: "Item-16",
                    color: "#FF8F00",
                    data: [17, 20, 16, 13, 22, 19, 16, 17, 23, 26, 20, 17, 18],
                },
                {
                    id: "item_17c",
                    name: "Item-17",
                    color: "#F57F17",
                    data: [16, 18, 14, 12, 20, 17, 14, 16, 21, 24, 18, 15, 16],
                },
                {
                    id: "item_18c",
                    name: "Item-18",
                    color: "#E65100",
                    data: [14, 16, 13, 10, 18, 16, 13, 14, 19, 22, 16, 14, 15],
                },
                {
                    id: "item_19c",
                    name: "Item-19",
                    color: "#DD2C00",
                    data: [12, 15, 11, 9, 16, 14, 11, 12, 17, 20, 15, 12, 13],
                },
                {
                    id: "item_20c",
                    name: "Item-20",
                    color: "#BF360C",
                    data: [11, 13, 10, 8, 15, 12, 10, 11, 16, 18, 13, 11, 12],
                },
                {
                    id: "item_21c",
                    name: "Item-21",
                    color: "#8D6E63",
                    data: [10, 12, 9, 7, 13, 11, 9, 10, 14, 16, 12, 10, 11],
                },
                {
                    id: "item_22c",
                    name: "Item-22",
                    color: "#6D4C41",
                    data: [9, 11, 8, 6, 12, 10, 8, 9, 13, 15, 11, 9, 10],
                },
                {
                    id: "item_23c",
                    name: "Item-23",
                    color: "#4E342E",
                    data: [8, 10, 7, 6, 11, 9, 7, 8, 11, 13, 10, 8, 9],
                },
                {
                    id: "item_24c",
                    name: "Item-24",
                    color: "#3E2723",
                    data: [7, 9, 7, 5, 10, 8, 7, 7, 10, 12, 9, 7, 8],
                },
                {
                    id: "item_25c",
                    name: "Item-25",
                    color: "#1B0000",
                    data: [6, 8, 6, 5, 9, 7, 6, 6, 9, 11, 8, 6, 7],
                },
            ],
        },
    ];
    const GROUP_NAMES = GROUPS.map((g) => ({ label: g.label, id: g.id }));

    const LINES = [
        {
            id: "line1",
            name: "Line-1",
            color: "#1a2940",
            yAxis: 0,
            data: [
                1640, 1675, 1510, 1480, 1640, 1635, 1500, 1520, 1710, 1770,
                1600, 1465, 1530,
            ],
        },
        {
            id: "line2",
            name: "Line-2",
            color: "#808080",
            yAxis: 0,
            data: [
                955, 940, 975, 945, 990, 965, 950, 960, 1100, 1120, 975, 950,
                965,
            ],
        },
        {
            id: "line3",
            name: "Line-3",
            color: "#27AE60",
            yAxis: 1,
            data: [
                255, 295, 315, 270, 355, 335, 305, 290, 360, 335, 360, 328, 340,
            ],
        },
    ];

    const BARS = [
        {
            id: "bar1",
            name: "Bar-1",
            color: "#5B2C6F",
            data: [
                320, 345, 310, 290, 360, 340, 315, 330, 370, 390, 350, 305, 325,
            ],
        },
    ];

    /* ── STACKED BAR ICON (Material Symbols font icon from CDN) ──── */

    const STACKED_BAR_ICON = '<i class="fa-solid fa-chart-column"></i>';
    // '<span class="material-symbols-outlined" style="font-size:15px;vertical-align:middle;margin-right:2px;color:#6b7079;line-height:1;"></span>';

    /* ── BUILD SERIES ARRAY ───────────────────────────────────────── */

    const seriesDefs = [];
    let divCounter = 0;

    /*
     * addDivider — HIGHCHARTS PATTERN
     * A dummy series with data:[] acts as a visual "|" separator in the legend.
     * enableMouseTracking:false keeps it invisible in the chart area.
     * legendItemClick returns false to cancel the default show/hide toggle.
     */
    function addDivider() {
        seriesDefs.push({
            id: "div" + divCounter++,
            name: "\u200b" + divCounter, // unique zero-width-space names
            type: "line",
            data: [],
            color: "transparent",
            lineWidth: 0,
            marker: { enabled: false },
            showInLegend: true,
            enableMouseTracking: false, // HIGHCHARTS OPTION: no chart hover
            custom: { isDivider: true },
            events: {
                legendItemClick: function () {
                    return false;
                }, // HIGHCHARTS EVENT
            },
        });
    }

    /*
     * Each group = one dummy group-header series + N member column series.
     * Group header has data:[] so it renders nothing in the chart area.
     * Its legendItemClick toggles all member series at once via chart.get(id).
     */
    const legendOwnerGroup = GROUPS[0].id;
    GROUPS.forEach(function (g, groupIndex) {
        var memberIds = g.members.map(function (m) {
            return m.id;
        });

        /* Group header dummy series — HIGHCHARTS DUMMY SERIES PATTERN */
        seriesDefs.push({
            id: "grp_" + g.id,
            name: g.label,
            type: "column",
            data: [],
            stack: g.id,
            stacking: "normal",
            color: "transparent",
            borderWidth: 0,
            showInLegend: g.id === legendOwnerGroup, // only show first group header in legend to save space; others are visually redundant
            // showInLegend: true, // only show first group header in legend to save space; others are visually redundant
            enableMouseTracking: false,
            custom: {
                isGroupHeader: true,
                groupIndex,
                groupId: g.id,
                memberIds: memberIds,
            },
            events: {
                /*
                 * legendItemClick — HIGHCHARTS EVENT
                 * Intercept: return false cancels default (which would hide
                 * the dummy series). Instead we toggle all member series.
                 * chart.get(id) and series.show()/hide() are PUBLIC APIs.
                 */
                legendItemClick: function (e) {
                    e.preventDefault();

                    const key = this.options.custom.sharedLegendKey;
                    const chart = this.chart;

                    const related = chart.series.filter(
                        (s) =>
                            s.options.custom &&
                            s.options.custom.sharedLegendKey === key,
                    );

                    const allHidden = related.every((s) => !s.visible);

                    related.forEach((s) => {
                        s.setVisible(allHidden, false);
                    });

                    chart.redraw();

                    return false;
                },
            },
        });

        /* Member column series — real data, stack into this group's tower */
        g.members.forEach(function (m) {
            seriesDefs.push({
                id: m.id,
                name: m.name,
                type: "column",
                color: m.color,
                data: m.data,
                stack: g.id, // HIGHCHARTS OPTION: cumulative within group
                stacking: "normal", // HIGHCHARTS OPTION: stack mode
                showInLegend: g.id === legendOwnerGroup,
                borderWidth: 0.5,
                borderColor: "#fff",
                custom: {
                    isMember: true,
                    groupId: g.id,
                    sharedLegendKey: m.name,
                    memberColor: m.color,
                },
            });
        });
    });

    addDivider();

    /* Line series 1 & 2 — primary (left) axis */
    [LINES[0], LINES[1]].forEach(function (l) {
        seriesDefs.push({
            id: l.id,
            type: "line",
            name: l.name,
            color: l.color,
            data: l.data,
            yAxis: l.yAxis,
            showInLegend: true,
            lineWidth: 1.5,
            marker: { enabled: false },
            states: { hover: { lineWidthPlus: 0 } },
            zIndex: 5,
            custom: { isLine: true, lineColor: l.color },
        });
    });

    /* Bar series — normal (non-stacked) column */
    BARS.forEach(function (b) {
        seriesDefs.push({
            id: b.id,
            type: "column",
            name: b.name,
            color: b.color,
            data: b.data,
            showInLegend: true,
            custom: { isBar: true, barColor: b.color },
        });
    });

    /* Line-3 — secondary (right) axis */
    seriesDefs.push({
        id: LINES[2].id,
        type: "line",
        name: LINES[2].name,
        color: LINES[2].color,
        data: LINES[2].data,
        yAxis: LINES[2].yAxis, // HIGHCHARTS OPTION: bind to right axis
        showInLegend: true,
        lineWidth: 1.5,
        marker: { enabled: false },
        states: { hover: { lineWidthPlus: 0 } },
        zIndex: 5,
        custom: { isLine: true, lineColor: LINES[2].color },
    });

    // dummy legends for testing
    Array(30)
        .fill(LINES)
        .flat()
        .forEach(function (l) {
            seriesDefs.push({
                id: l.id,
                type: "line",
                name: l.name,
                color: l.color,
                // data: l.data,
                // yAxis: l.yAxis,
                showInLegend: true,
                lineWidth: 1.5,
                marker: { enabled: false },
                states: { hover: { lineWidthPlus: 0 } },
                zIndex: 5,
                custom: { isLine: true, lineColor: l.color },
            });
        });

    /* ── HIGHCHARTS CHART CONFIG ──────────────────────────────────── */

    Highcharts.chart("msl-hc-chart", {
        chart: {
            type: "column",
            marginLeft: 68,
            marginRight: 62,
            marginTop: 44,
            style: {
                fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            },

            /*
             * chart.events.render — HIGHCHARTS LIFECYCLE HOOK
             *
             * Override setState on group-header dummy series so that
             * Highcharts' NATIVE legend hover redirects to members.
             * Individual series hover is 100% native — no custom code.
             */
            events: {
                load: function () {
                    const chart = this;

                    // custom event listeners for group-hover (when hovering over group header in legend, hover all members)
                    // prevent multiple bindings across redraws
                    if (chart._groupHoverBound) return;
                    chart._groupHoverBound = true;

                    const groupNameMouseOverHandler = function (e) {
                        const el = e.target.closest(".group-sub-item");
                        if (!el) return;

                        const targetId = el.getAttribute("id");
                        if (!targetId) return;

                        chart.series.forEach(function (s) {
                            const opt = s.options.custom || {};

                            if (opt.isDivider || opt.isGroupHeader) return;

                            const match = opt.groupId === targetId;

                            Highcharts.Series.prototype.setState.call(
                                s,
                                match ? "hover" : "inactive",
                            );
                        });
                    };

                    const groupNameMouseOutHandler = function (e) {
                        const el = e.target.closest(".group-sub-item");
                        if (!el) return;

                        chart.series.forEach(function (s) {
                            Highcharts.Series.prototype.setState.call(s, "");
                        });
                    };

                    // store for cleanup
                    chart._groupHoverHandlers = {
                        groupNameMouseOverHandler,
                        groupNameMouseOutHandler,
                    };

                    chart.container.addEventListener(
                        "mouseover",
                        groupNameMouseOverHandler,
                    );

                    chart.container.addEventListener(
                        "mouseout",
                        groupNameMouseOutHandler,
                    );
                    // -- custom event listeners for group-hover (when hovering over group header in legend, hover all members)
                },
                render: function () {
                    var chart = this;

                    // 1. OVERRIDE OVERALL SERIES BEHAVIORS (Cross-series lines/bars tracking)
                    chart.series.forEach(function (s) {
                        if (s._stateOverridden) return;
                        s._stateOverridden = true;

                        s.setState = function (state) {
                            var currentOpt =
                                (this.options && this.options.custom) || {};

                            // Reset all series states completely
                            if (!state || state === "") {
                                chart.series.forEach(function (other) {
                                    Highcharts.Series.prototype.setState.call(
                                        other,
                                        "",
                                    );
                                });
                                return;
                            }

                            // Sync across sharedLegendKey items (e.g. Item-1, Item-2)
                            if (currentOpt.sharedLegendKey) {
                                var targetKey = currentOpt.sharedLegendKey;
                                chart.series.forEach(function (other) {
                                    var otherOpt =
                                        (other.options &&
                                            other.options.custom) ||
                                        {};
                                    if (
                                        otherOpt.sharedLegendKey === targetKey
                                    ) {
                                        Highcharts.Series.prototype.setState.call(
                                            other,
                                            "hover",
                                        );
                                    } else {
                                        Highcharts.Series.prototype.setState.call(
                                            other,
                                            "inactive",
                                        );
                                    }
                                });
                                return;
                            }

                            Highcharts.Series.prototype.setState.call(
                                this,
                                state,
                            );
                        };
                    });
                },
            },
        },

        title: {
            text: "Inventory Profile",
            align: "center",
            style: { fontSize: "14px", fontWeight: "600", color: "#16191d" },
        },
        subtitle: { text: null },

        /*
         * ── LEGEND CONFIG — all Highcharts options ───────────────────
         *
         * useHTML: true            Labels become real HTML (spans, SVG, etc.)
         * labelFormatter           Callback returns HTML string per item
         * symbolWidth/Height: 0    Hides the auto-generated SVG symbol so
         *                          our HTML label carries the color indicator
         * symbolPadding: 0         Removes gap between hidden symbol and label
         * maxHeight                Caps legend height → triggers pagination
         */
        legend: {
            enabled: true,
            useHTML: true,
            layout: "horizontal",
            align: "left",
            verticalAlign: "bottom",
            alignColumns: false,
            maxHeight: 100,
            navigation: {
                activeColor: "#2563eb",
                inactiveColor: "#ccc",
                arrowSize: 12,
                animation: true,
                style: { fontWeight: "bold", color: "#333", fontSize: "12px" },
            },
            padding: 8,
            itemMarginTop: 5,
            itemMarginBottom: 5,
            itemDistance: 15,
            symbolWidth: 0,
            symbolHeight: 0,
            symbolPadding: 0,
            itemStyle: {
                fontWeight: "normal",
                fontSize: "12px",
                color: "#16191d",
                cursor: "pointer",
                textOverflow: "none", // Stops Highcharts from generating/calculating ellipsis mid-render
                whiteSpace: "nowrap", // Prevents text from trying to wrap to a new line
            },
            // itemHoverStyle: { fontWeight: 'bold', color: '#2563eb' },

            /*
             * labelFormatter — HIGHCHARTS OPTION
             * `this` = series object. Returns HTML that becomes the full
             * visual for each legend item (symbol + label combined).
             *
             * Branching:
             *   isDivider     → a styled "|" vertical bar
             *   isGroupHeader → bar-chart icon + bold group name
             *   isLine        → colored horizontal line swatch + name
             *   isMember      → colored square swatch + name
             */
            labelFormatter: function () {
                var custom = (this.options && this.options.custom) || {};

                /* "|" DIVIDER — styled pipe character */
                if (custom.isDivider) {
                    return (
                        '<span style="' +
                        "display:inline-block;width:1px;height:14px;" +
                        "background:#d4d4d8;vertical-align:middle;" +
                        "pointer-events:none;" +
                        '"></span>'
                    );
                }

                /* GROUP HEADER — stacked bar icon + bold label */
                if (custom.isGroupHeader) {
                    return `
                        <span style="display:inline-flex;align-items:center;gap:10px;">
                            ${GROUP_NAMES.map((group) => {
                                return `
                                <span 
                                    id="${group.id}"
                                    class="group-sub-item"
                                    style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;"
                                >
                                    ${STACKED_BAR_ICON}
                                    <b style="font-weight:700;color:#16191d;font-size:11.5px;pointer-events:none;">
                                        ${group.label}:
                                    </b>
                                </span>
                            `;
                            }).join("")}
                        </span>
                    `;
                }

                /* LINE SERIES — horizontal color stripe + name */
                if (custom.isLine) {
                    return (
                        '<span style="display:inline-flex;align-items:center;gap:5px;">' +
                        '<span style="' +
                        "display:inline-block;width:20px;height:3px;" +
                        "background:" +
                        custom.lineColor +
                        ";" +
                        "border-radius:1px;flex-shrink:0;" +
                        '"></span>' +
                        '<span style="font-size:11.5px;">' +
                        this.name +
                        "</span>" +
                        "</span>"
                    );
                }

                /* BAR SERIES (non-stacked) — colored square + name */
                if (custom.isBar) {
                    return `<span style="display:inline-flex;align-items:center;gap:4px;">
                                ${STACKED_BAR_ICON}
                                <b style="font-weight:700;color:#16191d;font-size:11.5px;">
                                    ${this.name}
                                </b>
                            </span>`;
                }

                /* MEMBER (stacked column) — colored square + name */
                if (custom.isMember) {
                    return (
                        '<span style="display:inline-flex;align-items:center;gap:4px;">' +
                        '<span style="' +
                        "display:inline-block;width:10px;height:10px;" +
                        "background:" +
                        custom.memberColor +
                        ";" +
                        "border-radius:1px;flex-shrink:0;" +
                        '"></span>' +
                        '<span style="font-size:11.5px;">' +
                        this.name +
                        "</span>" +
                        "</span>"
                    );
                }

                return this.name;
            },
        },

        xAxis: {
            categories: MONTHS,
            labels: { style: { fontSize: "11.5px", color: "#6b7079" } },
            /*
             * xAxis.plotLines — HIGHCHARTS OPTION
             * Orange vertical rule for the "current time bucket" boundary.
             */
            plotLines: [
                {
                    value: 7.5,
                    color: "#f5a623",
                    width: 2,
                    zIndex: 4,
                },
            ],
            gridLineWidth: 0,
            lineColor: "#9aa0a8",
            tickColor: "transparent",
        },

        yAxis: [
            {
                /* Primary left axis */
                min: 0,
                max: 2000,
                tickAmount: 5,
                title: { text: null },
                labels: {
                    formatter: function () {
                        return this.value >= 1000
                            ? (this.value / 1000).toFixed(1) + "k"
                            : this.value.toFixed(1);
                    },
                    style: { fontSize: "11.5px", color: "#6b7079" },
                },
                gridLineColor: "#ededf0",
            },
            {
                /*
                 * yAxis[1].opposite: true — HIGHCHARTS OPTION
                 * Places the secondary axis on the right side.
                 */
                opposite: true,
                min: 0,
                max: 450,
                tickAmount: 4,
                title: { text: null },
                labels: { style: { fontSize: "11.5px", color: "#6b7079" } },
                gridLineWidth: 0,
            },
        ],
        // accessibility: {
        //     series: {
        //         describeSingleSeries: false // Disables prefixing the series type name
        //     }
        // },
        accessibility: {
            enabled: true,
            landmarkVerbosity: "disabled",
            screenReaderSection: {
                beforeChartFormat: "",
                afterChartFormat: "",
            },
            series: {
                describeSingleSeries: false,
            },
            keyboardNavigation: {
                order: ["series"],
            },
        },
        plotOptions: {
            column: {
                stacking: "normal", // HIGHCHARTS OPTION
                groupPadding: 0.14,
                pointPadding: 0.03,
                maxPointWidth: 22,
            },
            line: {
                marker: { enabled: false },
            },
            series: {
                states: {
                    /*
                     * states.inactive.opacity — HIGHCHARTS OPTION
                     * Controls how dim a series becomes when another is
                     * highlighted. Called by series.setState('inactive').
                     */
                    inactive: { opacity: 0.15 },
                },
            },
        },

        tooltip: { shared: false, useHTML: true, style: { fontSize: "12px" } },
        credits: { enabled: false },

        series: seriesDefs,
        destroy: function () {
            const chart = this;

            if (!chart._groupHoverHandlers) return;

            chart.container.removeEventListener(
                "mouseover",
                chart._groupHoverHandlers.groupNameMouseOverHandler,
            );

            chart.container.removeEventListener(
                "mouseout",
                chart._groupHoverHandlers.groupNameMouseOutHandler,
            );
        },
    });
}
