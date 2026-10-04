const fs = require('fs')
const path = require('path')

const nextBin = require.resolve('next/dist/bin/next')
const envFile = path.resolve(__dirname, '../../.env')

const activeDistDir = (() => {
  try {
    return path.basename(fs.realpathSync(path.join(__dirname, '.next')))
  } catch {
    return '.next'
  }
})()

module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || 'web',
      script: nextBin,
      args: 'start',
      cwd: __dirname,
      exec_mode: 'cluster',
      instances: Number(process.env.WEB_INSTANCES) || 2,
      node_args: `--env-file=${envFile}`,
      env: { NEXT_DIST_DIR: activeDistDir },
      max_memory_restart: '900M',
      listen_timeout: 10000,
      kill_timeout: 10000,
    },
  ],
}
