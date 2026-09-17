import * as maplibregl from "maplibre-gl";

// Shared by every map surface in this app (the full explorer in Map.tsx,
// the small single-pin preview in LocationMiniMapCanvas.tsx) so "the same
// map, just a different window into it" is actually true at the pixel
// level — one definition, not two that quietly drift apart over time.

// OpenFreeMap/OpenMapTiles labels are usually a single `["get","name"]`
// (or a coalesce over name:latin/name:nonlatin for non-Latin scripts) — none
// of that is configurable client-side the way CARTO's raster tiles weren't
// at all. Vector labels are just style-layer properties, so this walks every
// symbol layer whose text-field already renders a place name (roads'
// numbered shields use "ref", not "name", and are left untouched) and points
// it at the French name first, falling back to the generic one.
export function applyFrenchLabels(map: maplibregl.Map) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    if (layer.type !== "symbol") continue;
    const textField = map.getLayoutProperty(layer.id, "text-field");
    if (textField === undefined) continue;
    let referencesName = false;
    try {
      referencesName = JSON.stringify(textField).includes('"name');
    } catch {
      continue;
    }
    if (!referencesName) continue;
    map.setLayoutProperty(layer.id, "text-field", ["coalesce", ["get", "name:fr"], ["get", "name"]]);
  }
}

// Liberty ships as a general-purpose basemap — every shop, playground,
// bench, waste basket and transit stop OpenMapTiles ranks as a POI gets its
// own icon+label, and every road is a fairly loud amber/orange. None of
// that serves this app: the places/events we actually want on screen are
// the app's own pins, so the base map's job is just legible geography under
// them, not a second, competing layer of icons. Applied at runtime for the
// same reason as applyFrenchLabels above — the style is fetched live from
// OpenFreeMap, there's no local file to edit.
export function applyCleanTheme(map: maplibregl.Map) {
  // Every generic point-of-interest layer: shops, playgrounds, waste
  // baskets, benches, cafes — and transit stops (bus/rail/airport), on
  // explicit request even though those are arguably useful wayfinding,
  // because the ask was "nothing except street/city/district names and my
  // own data". Street names, city/town/district labels (label_*,
  // highway-name-*) are deliberately left alone — those are the labels
  // that make a map still usable, not clutter. The numbered road-shield
  // badges (A1, A23...) are a separate ask, on top: useful on a road atlas,
  // not on a "find a bar nearby" map, and it's these three layers
  // specifically that draw them (found by fetching the Liberty style JSON
  // directly and filtering for "shield" — OpenMapTiles' own naming, not a
  // guess).
  for (const layerId of [
    "poi_r1",
    "poi_r7",
    "poi_r20",
    "poi_transit",
    "airport",
    "highway-shield-non-us",
    "highway-shield-us-interstate",
    "road_shield_us",
  ]) {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", "none");
  }

  // Cast to a loose signature: MapLibre's setPaintProperty types its second
  // argument as a union of every known paint-property name per layer type,
  // which is exactly right for a normal call site but too narrow for a
  // small helper meant to set whichever property each of these layers
  // actually has (fill-color here, line-color there) — the style spec
  // already validates the shape at runtime regardless.
  const setPaintProperty = map.setPaintProperty.bind(map) as (id: string, name: string, value: unknown) => void;
  const setPaint = (layerId: string, paint: Record<string, unknown>) => {
    if (!map.getLayer(layerId)) return;
    for (const [prop, value] of Object.entries(paint)) {
      setPaintProperty(layerId, prop, value);
    }
  };

  // Parks: Liberty's default is a ~70%-transparent pale sage that barely
  // reads as green. The one thing a park color needs to communicate is
  // "there's green space here" — so make it an actually vivid, saturated
  // green instead of a wash — but only once "a park" actually means a real
  // city park, not a national-park-scale nature reserve. OpenMapTiles'
  // `park` source-layer has no size/class filter of its own: a corner
  // playground in Lille and, say, the Forêt d'Orléans nature reserve are
  // both plain "park" features, so a flat vivid-green override painted huge
  // regional conservation areas the same saturated color and turned them
  // into a wall-to-wall green stain the moment anyone zoomed out past the
  // city (reported: "d'énormes zones vertes" around Centre-Val de Loire).
  // A zoom-interpolated color is the fix that actually holds at both ends:
  // vivid at the city zoom this app is actually meant to be browsed at,
  // fading back to Liberty's own quiet default by the time a park-sized
  // polygon has become a country-sized one on screen — one color scale, not
  // a class allow-list that would need to guess every OSM tag a giant
  // reserve might carry.
  const PARK_FILL_COLOR = ["interpolate", ["linear"], ["zoom"], 9, "#d8e8c8", 13, "#7bc96f"] as unknown as string;
  const PARK_FILL_OPACITY = ["interpolate", ["linear"], ["zoom"], 9, 0.7, 13, 0.85] as unknown as number;
  const PARK_OUTLINE_COLOR = ["interpolate", ["linear"], ["zoom"], 9, "#e4f1d7", 13, "#5aab4e"] as unknown as string;
  setPaint("park", {
    "fill-color": PARK_FILL_COLOR,
    "fill-opacity": PARK_FILL_OPACITY,
    "fill-outline-color": PARK_OUTLINE_COLOR,
  });
  setPaint("park_outline", { "line-color": PARK_OUTLINE_COLOR });
  setPaint("landcover_grass", { "fill-color": "#a9dd93", "fill-opacity": 0.35 });

  // Forests (landcover_wood): dropped entirely, on request — a big flat
  // green blob covering the outskirts read as a rendering smudge rather
  // than useful geography on a map about bars/activities/events inside
  // Lille itself, not a hiking app. Hidden outright rather than just
  // recolored, same treatment as the POI/shield layers above.
  if (map.getLayer("landcover_wood")) map.setLayoutProperty("landcover_wood", "visibility", "none");

  // Roads: Liberty colors every class above "minor" in amber/orange
  // (motorway/trunk/primary/secondary/tertiary and their link/ramp
  // variants, each again for plain/bridge/tunnel) — replaced with a
  // neutral grey scale instead. Class still reads through width and shade
  // (darker+wider = bigger road); it just doesn't also claim a hue that
  // has no wayfinding meaning here.
  const roadClasses: { cls: string; fill: string; casing: string }[] = [
    { cls: "motorway", fill: "#dfe2e6", casing: "#c3c8cf" },
    { cls: "motorway_link", fill: "#dfe2e6", casing: "#c3c8cf" },
    { cls: "trunk_primary", fill: "#eceae6", casing: "#d6d2ca" },
    { cls: "secondary_tertiary", fill: "#f2f0ec", casing: "#dedad2" },
    { cls: "link", fill: "#eceae6", casing: "#d6d2ca" },
  ];
  for (const { cls, fill, casing } of roadClasses) {
    for (const prefix of ["road", "bridge", "tunnel"]) {
      setPaint(`${prefix}_${cls}`, { "line-color": fill });
      setPaint(`${prefix}_${cls}_casing`, { "line-color": casing });
    }
  }
}

// The tile source's attribution string is a single atomic blob —
// "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" — that
// AttributionControl has no option to cherry-pick from, since the three
// credits aren't separate entries; only the resulting DOM node can be
// edited. OpenStreetMap's own data licence is the one that actually
// requires attribution here, so this keeps just that one. Overwriting
// unconditionally (not reading the existing text first) means it doesn't
// matter whether the control has already built its real attribution string
// by this point or not.
export function simplifyAttribution(map: maplibregl.Map) {
  const attribInner = map.getContainer().querySelector(".maplibregl-ctrl-attrib-inner");
  if (attribInner) {
    attribInner.innerHTML = '<a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a>';
  }
}
