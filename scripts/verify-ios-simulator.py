"""Inspect a built simulator archive without extracting or running its content."""
import json
import plistlib
import sys
import tarfile

with tarfile.open(sys.argv[1]) as archive:
    files = [m for m in archive.getmembers() if m.isfile()]
    plists = [m for m in files if m.name.endswith('.app/Info.plist')]
    assert len(plists) == 1, 'Expected exactly one application Info.plist'
    assert plists[0].size < 1048576
    info = plistlib.loads(archive.extractfile(plists[0]).read())
    assert info['CFBundleIdentifier'] == 'com.just1date.app'
    assert 'iPhoneSimulator' in info['CFBundleSupportedPlatforms']
    for permission in ['NSCameraUsageDescription', 'NSMicrophoneUsageDescription', 'NSPhotoLibraryUsageDescription']:
        assert isinstance(info.get(permission), str) and len(info[permission]) > 10
    bundles = [m for m in files if m.name.endswith('/main.jsbundle')]
    assert len(bundles) == 1 and bundles[0].size < 33554432
    bundle = archive.extractfile(bundles[0]).read()
    assert b'Just One Date' in bundle, 'Updated date-planning screen is missing'
    assert b'https://just1date-api-whaleswealth.vercel.app' in bundle, 'Approved production API origin is missing'
    print(json.dumps({'bundle_id': info['CFBundleIdentifier'], 'platform': 'iPhoneSimulator', 'version': info['CFBundleShortVersionString'], 'permissions_present': True, 'date_planning_copy_present': True, 'device_installable': False}))
