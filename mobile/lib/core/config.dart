/// Central configuration for the NyumbaLink mobile application.
///
/// NyumbaLink is a *light client*: it depends on a powerful cloud backend and
/// never bundles property photos, videos, maps, or offline data (product spec
/// #60). Everything dynamic is fetched on demand over the network.
library;

/// Default backend host. The public cloud link can change on tunnel restart,
/// so the user may override it from the in-app Settings screen.
const String kDefaultApiBaseUrl =
    'https://banner-webcams-logging-tales.trycloudflare.com';

/// OpenStreetMap raster tiles (street / roadmap view).
const String kOsmTileTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/// Esri World Imagery tiles (satellite view). These contain no place labels,
/// so we draw a separate reference layer on top of them.
const String kSatelliteTileTemplate =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

/// Esri reference layer that draws city, county and country place names. It is
/// rendered above the satellite imagery so names are visible on satellite view.
const String kSatelliteLabelsTemplate =
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

const String kAppName = 'NyumbaLink';
const String kApiVersionPath = '/api/v1';
