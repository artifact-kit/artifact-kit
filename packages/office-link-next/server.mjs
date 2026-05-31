import { createServer } from "node:https";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "node:url";
import next from "next";

const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOST || "localhost";
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, hostname, port, webpack: dev });
const handle = app.getRequestHandler();

function readCliOption(name) {
  const argv = process.argv.slice(2);
  const aliases = [`--${name}`, `-${name}`];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    for (const alias of aliases) {
      if (arg === alias) {
        const value = argv[index + 1];
        return value && !value.startsWith("-") ? value : undefined;
      }

      if (arg.startsWith(`${alias}=`)) {
        return arg.slice(alias.length + 1);
      }
    }
  }

  return undefined;
}

function certPath(name) {
  return (
    readCliOption(name) ||
    process.env[`OFFICELINK_${name.toUpperCase()}`] ||
    process.env[`HTTPS_${name.toUpperCase()}`]
  );
}

async function readRequiredFile(name, filePath) {
  if (!filePath) {
    throw new Error(`Missing HTTPS ${name} path.`);
  }

  try {
    return await readFile(resolve(filePath));
  } catch (error) {
    throw new Error(`Unable to read HTTPS ${name} file at ${filePath}: ${error.message}`);
  }
}

async function readHttpsOptions() {
  const ca = certPath("ca");
  const key = certPath("key");
  const cert = certPath("cert");

  if (!ca || !key || !cert) {
    console.error("OfficeLink requires explicit HTTPS certificate paths.");
    console.error("Usage: node server.mjs --ca <ca.crt> --key <localhost.key> --cert <localhost.crt>");
    console.error("Or set OFFICELINK_CA, OFFICELINK_KEY, and OFFICELINK_CERT.");
    process.exit(1);
  }

  return {
    ca: await readRequiredFile("ca", ca),
    key: await readRequiredFile("key", key),
    cert: await readRequiredFile("cert", cert),
    paths: {
      ca: resolve(ca),
      key: resolve(key),
      cert: resolve(cert),
    },
  };
}

const httpsOptions = await readHttpsOptions();

await app.prepare();

createServer(
  {
    ca: httpsOptions.ca,
    key: httpsOptions.key,
    cert: httpsOptions.cert,
  },
  (req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    handle(req, res, parsedUrl);
  },
).listen(port, hostname, () => {
  console.log(`OfficeLink ready on https://${hostname}:${port}`);
  console.log(`HTTPS CA: ${httpsOptions.paths.ca}`);
  console.log(`HTTPS cert: ${httpsOptions.paths.cert}`);
  console.log(`HTTPS key: ${httpsOptions.paths.key}`);
});
