import { readFile } from "node:fs/promises";
import { parse } from "dotenv";
import { spawnSync } from "node:child_process";
const path = process.argv[2];
const python = process.env.PYTHON_EXECUTABLE;
if (!path || !python)
  throw new Error("Set PYTHON_EXECUTABLE and provide the APK path.");
const env = parse(await readFile(".env.local", "utf8"));
const keys = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "PAYSTACK_SECRET_KEY",
  "OPENAI_API_KEY",
  "LIVEKIT_API_SECRET",
];
const secrets = Object.fromEntries(
  keys.filter((key) => env[key]).map((key) => [key, env[key]]),
);
const result = spawnSync(
  python,
  [
    "-c",
    `import json,sys,zipfile,tarfile
values=json.load(sys.stdin)
if sys.argv[1].endswith('.tar.gz'):
 with tarfile.open(sys.argv[1]) as archive:
  names=[m for m in archive.getmembers() if m.isfile() and m.name.endswith('/main.jsbundle')]
  if len(names)!=1: raise SystemExit('Expected a single iOS application bundle.')
  data=archive.extractfile(names[0]).read()
else:
 with zipfile.ZipFile(sys.argv[1]) as archive:
  prefix='base/' if sys.argv[1].endswith('.aab') else ''
  data=archive.read(prefix+'assets/index.android.bundle')
matches=[key for key,value in values.items() if value.encode() in data]
if matches:
 print('Privileged values detected: '+','.join(matches));sys.exit(1)
print(json.dumps({'private_values_checked':len(values),'privileged_values_in_native_bundle':False}))`,
    path,
  ],
  { input: JSON.stringify(secrets), encoding: "utf8" },
);
if (result.status !== 0)
  throw new Error(result.stdout || "Native secret scan failed.");
console.log(result.stdout.trim());
