#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$ROOT/ios"

echo "→ Quit Xcode first if it is open (Cmd+Q)"
echo "→ Stopping Metro if running (ignore errors)"
pkill -f "expo start" 2>/dev/null || true

echo "→ Removing iOS build artifacts"
rm -rf "$IOS_DIR/Pods" "$IOS_DIR/Podfile.lock" "$IOS_DIR/build"

echo "→ Clearing Xcode DerivedData and module cache for expotest"
rm -rf "$HOME/Library/Developer/Xcode/DerivedData/expotest-"*
rm -rf "$HOME/Library/Developer/Xcode/DerivedData/ModuleCache.noindex"

echo "→ Stripping extended attributes from app sources (codesign fix)"
xattr -cr "$IOS_DIR/expotest" 2>/dev/null || true

echo "→ Installing CocoaPods (takes 2-4 minutes)"
cd "$IOS_DIR"
pod install

echo "→ Telling macOS not to sync Pods (prevents duplicate Headers 2 folders)"
xattr -w com.apple.fileprovider.ignore#P 1 "$IOS_DIR/Pods" 2>/dev/null || true

echo "→ Stripping extended attributes from prebuilt frameworks"
for pod in ReactNativeDependencies hermes-engine React-Core-prebuilt ExpoModulesJSI; do
  if [[ -d "Pods/$pod" ]]; then
    xattr -cr "Pods/$pod" 2>/dev/null || true
  fi
done

echo "→ Verifying Pods integrity"
DUPLICATE_PODS="$(find "$IOS_DIR/Pods" -maxdepth 1 -name '* 2' -o -name '* 3' -o -name '* 4' 2>/dev/null | head -1 || true)"
if [[ -n "$DUPLICATE_PODS" ]]; then
  echo "ERROR: Corrupted Pods folder (duplicate entries like 'Headers 2')."
  echo "       Move the project out of iCloud Desktop/Documents, then rerun: npm run ios:clean"
  exit 1
fi

if [[ ! -f "$IOS_DIR/Pods/libavif/src/alpha.c" ]]; then
  echo "ERROR: libavif pod is incomplete after pod install."
  exit 1
fi

if [[ ! -f "$IOS_DIR/Pods/React-Core-prebuilt/React-VFS.yaml" ]]; then
  echo "ERROR: React-Core-prebuilt VFS overlay missing after pod install."
  exit 1
fi

echo "→ Building for device to verify"
if xcodebuild \
  -workspace "$IOS_DIR/expotest.xcworkspace" \
  -scheme expotest \
  -configuration Debug \
  -destination 'generic/platform=iOS' \
  build > /tmp/expotest-ios-build.log 2>&1; then
  echo "BUILD SUCCEEDED"
else
  echo "BUILD FAILED — last errors:"
  rg -i "error:|BUILD FAILED" /tmp/expotest-ios-build.log | tail -15
  exit 1
fi

echo ""
echo "Done. In Xcode:"
echo "  1. Open $IOS_DIR/expotest.xcworkspace"
echo "  2. Product → Clean Build Folder (Shift+Cmd+K)"
echo "  3. Delete the app from your iPhone"
echo "  4. Run (Cmd+R)"
echo ""
echo "Or from terminal: npm run ios:device"
