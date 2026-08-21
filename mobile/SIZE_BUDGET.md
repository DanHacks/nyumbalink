# NyumbaLink Mobile — Android size budget (≤ 11 MB download)

The production download target is **11 MB or less** on Google Play. Installed size may be larger.

## How the budget is met

| Lever | Effect |
|---|---|
| `buildType: "app-bundle"` (AAB) in `eas.json` → Play Store delivers only the resources + native libs for the user's device | Biggest saving; typical Expo app drops from ~25 MB universal APK to ~8–11 MB download |
| Hermes bytecode engine (default, Expo SDK 57) | Smaller and faster than JIT |
| No embedded fonts/media beyond app icons | Icons recompressed to palette PNGs (~250 KB total) |
| Lean dependency set: expo-router, react-native-maps, zustand, axios, secure-store, location | No heavy UI kits |

## Verify before each release

```bash
cd mobile
eas build --platform android --profile production   # produces .aab
# Download size shown on the build page is what Play Store reports per device.
```

For a quick local approximation of the Play download:

```bash
npx expo export --platform android   # JS bundle only check
```

## Rules to keep it under budget

1. Do not add full SDKs (Firebase, analytics) without checking size impact.
2. Prefer vector icons (`@expo/vector-icons` subsets) over bundled images.
3. Never commit large media into `mobile/assets/`.
4. If a new native module pushes the AAB over budget, evaluate `react-native-maps` alternatives last — maps are core.
