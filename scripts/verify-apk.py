"""Inspect a real APK/AAB. Official signature/packaging checks also run in CI."""
import hashlib
import json
import struct
import sys
import zipfile

path = sys.argv[1]
is_bundle = path.lower().endswith(".aab")
prefix = "base/" if is_bundle else ""
with open(path, "rb") as source:
    digest = hashlib.file_digest(source, "sha256").hexdigest()
with zipfile.ZipFile(path) as archive:
    names = archive.namelist()
    required = (["base/manifest/AndroidManifest.xml", "base/dex/classes.dex", "BundleConfig.pb"]
                if is_bundle else ["AndroidManifest.xml", "classes.dex"])
    required.append(prefix + "assets/index.android.bundle")
    for name in required:
        if name not in names:
            raise SystemExit(f"Missing native application component: {name}")
    bundle = archive.read(prefix + "assets/index.android.bundle")
    if b"https://just1date-api.vercel.app" not in bundle:
        raise SystemExit("Production API origin is absent from the native bundle.")
    if b"http://localhost:4000" in bundle:
        raise SystemExit("Refusing a native bundle pointed at the developer's computer.")
    libraries = []
    for name in names:
        if not name.startswith((prefix + "lib/arm64-v8a/", prefix + "lib/x86_64/")) or not name.endswith(".so"):
            continue
        data = archive.read(name)
        if data[:6] != b"\x7fELF\x02\x01":
            raise SystemExit(f"Unexpected 64-bit library format: {name}")
        offset = struct.unpack_from("<Q", data, 32)[0]
        size, count = struct.unpack_from("<HH", data, 54)
        alignments = []
        for index in range(count):
            header = offset + index * size
            if struct.unpack_from("<I", data, header)[0] == 1:
                alignments.append(struct.unpack_from("<Q", data, header + 48)[0])
        if not alignments or min(alignments) < 16384:
            raise SystemExit(f"64-bit library lacks 16 KiB load alignment: {name}")
        libraries.append(name)
    if not any(name.startswith(prefix + "lib/arm64-v8a/") for name in libraries):
        raise SystemExit("No Android ARM64 native libraries were found.")
print(json.dumps({"sha256": digest, "native_components": True, "production_api": True,
                  "developer_localhost": False, "native_64bit_libraries": len(libraries),
                  "elf_16k_alignment": True}, indent=2))
