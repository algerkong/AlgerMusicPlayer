const { spawn } = await import('node:child_process');
const { existsSync } = await import('node:fs');
const { readFile, rm, writeFile } = await import('node:fs/promises');
const path = await import('node:path');

const workdir = process.cwd();
const exePath = process.env.AMPL_EXE_PATH
  ? path.resolve(process.env.AMPL_EXE_PATH)
  : path.resolve('.tmp', 'installer-smoke-x64-latest', 'AMPL Music.exe');
const outBase = process.env.AMPL_SUITE_OUT_BASENAME || 'installed-release-smoke-suite';

if (!existsSync(exePath)) {
  throw new Error(`exe not found: ${exePath}`);
}

const steps = [
  {
    key: 'theme-preset',
    script: 'scripts/qa/smoke-theme-preset.mjs',
    routeOutBaseName: 'suite-installed-theme-preset'
  },
  {
    key: 'search-playback',
    script: 'scripts/qa/smoke-search-playback.mjs',
    routeOutBaseName: 'suite-installed-search-playback'
  },
  {
    key: 'download-postactions',
    script: 'scripts/qa/smoke-download-postactions.mjs',
    routeOutBaseName: 'suite-installed-download-postactions'
  },
  {
    key: 'local-music-maintenance',
    script: 'scripts/qa/smoke-local-music-maintenance.mjs',
    routeOutBaseName: 'suite-installed-local-music-maintenance'
  },
  {
    key: 'local-music-health-repair',
    script: 'scripts/qa/smoke-local-music-health-repair.mjs',
    routeOutBaseName: 'suite-installed-local-music-health-repair'
  },
  {
    key: 'account-journey',
    script: 'scripts/qa/smoke-installed-account-journey.mjs',
    accountOutBaseName: 'suite-installed-account-journey'
  },
  {
    key: 'auto-cookie-window',
    script: 'scripts/qa/smoke-installed-auto-cookie-window.mjs',
    autoCookieOutBaseName: 'suite-installed-auto-cookie-window'
  }
];

function runNodeScript(step) {
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      AMPL_EXE_PATH: exePath
    };

    if (step.routeOutBaseName) {
      env.AMPL_ROUTE_OUT_BASENAME = step.routeOutBaseName;
    }
    if (step.accountOutBaseName) {
      env.AMPL_ACCOUNT_OUT_BASENAME = step.accountOutBaseName;
    }
    if (step.autoCookieOutBaseName) {
      env.AMPL_AUTO_COOKIE_OUT_BASENAME = step.autoCookieOutBaseName;
    }

    const child = spawn('node', [step.script], {
      cwd: workdir,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('exit', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.on('error', (error) =>
      resolve({
        code: 1,
        stdout,
        stderr: `${stderr}\n${error.stack || error.message}`
      })
    );
  });
}

async function tryReadJson(jsonPath) {
  try {
    const raw = await readFile(jsonPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const results = [];

for (const step of steps) {
  const expectedBaseName =
    step.accountOutBaseName ||
    step.autoCookieOutBaseName ||
    step.routeOutBaseName ||
    `${outBase}-${step.key}`;
  const expectedJsonPath = path.resolve('.tmp', `${expectedBaseName}.json`);
  const expectedPngPath = path.resolve('.tmp', `${expectedBaseName}.png`);
  await rm(expectedJsonPath, { force: true }).catch(() => {});
  await rm(expectedPngPath, { force: true }).catch(() => {});

  const startedAt = new Date().toISOString();
  const execution = await runNodeScript(step);
  const finishedAt = new Date().toISOString();

  let parsedStdout = null;
  try {
    parsedStdout = JSON.parse(execution.stdout.trim());
  } catch (error) {
    void error;
  }

  const jsonPath = parsedStdout?.jsonPath || expectedJsonPath;

  const artifact = await tryReadJson(jsonPath);

  const artifactPass =
    typeof artifact?.pass === 'boolean'
      ? artifact.pass
      : typeof artifact?.payload?.pass === 'boolean'
        ? artifact.payload.pass
        : typeof parsedStdout?.pass === 'boolean'
          ? parsedStdout.pass
          : typeof parsedStdout?.payload?.pass === 'boolean'
            ? parsedStdout.payload.pass
            : null;
  const ok = execution.code === 0 && artifactPass !== false;

  results.push({
    key: step.key,
    script: step.script,
    startedAt,
    finishedAt,
    exitCode: execution.code,
    ok,
    artifactPass,
    jsonPath,
    parsedStdout,
    artifact,
    stderr: execution.stderr.trim() || null
  });
}

const pass = results.every((item) => item.ok);
const suitePath = path.resolve('.tmp', `${outBase}.json`);

await writeFile(
  suitePath,
  JSON.stringify(
    {
      exePath,
      pass,
      results
    },
    null,
    2
  ),
  'utf8'
);

console.log(
  JSON.stringify(
    {
      suitePath,
      exePath,
      pass,
      summary: results.map((item) => ({
        key: item.key,
        ok: item.ok,
        jsonPath: item.jsonPath
      }))
    },
    null,
    2
  )
);
