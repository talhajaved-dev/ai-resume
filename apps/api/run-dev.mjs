import { spawn } from 'node:child_process';

const env = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: process.env.PORT ?? '8080',
};

const build = spawn(process.execPath, ['./build.mjs'], {
  stdio: 'inherit',
  env,
});

build.on('exit', (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  const start = spawn(process.execPath, ['--enable-source-maps', './dist/index.mjs'], {
    stdio: 'inherit',
    env,
  });

  start.on('exit', (startCode) => {
    process.exit(startCode ?? 0);
  });
});
