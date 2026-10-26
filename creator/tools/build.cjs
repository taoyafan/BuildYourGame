const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const target = process.argv[2] || 'web-mobile';
const project = path.resolve(__dirname, '..');
const config = path.join(project, 'build-configs', target + '.json');
const executable = process.env.COCOS_CREATOR;
if (!fs.existsSync(config)) throw new Error('Unsupported build target: ' + target);
if (!executable || !fs.existsSync(executable)) throw new Error('Set COCOS_CREATOR to the Creator 3.8.8 executable path.');
require('./prepare.cjs');
fs.mkdirSync(path.join(project, 'temp'), { recursive: true });
const destination = path.join(project, 'temp', 'build-' + target + '.log');
const log = fs.createWriteStream(destination);
const child = spawn(executable, ['--project', project, '--build', 'configPath=' + config], {
  stdio: ['ignore', 'pipe', 'pipe']
});
let remainder = '';
function output(chunk) {
  const text = chunk.toString();
  log.write(text);
  const lines = (remainder + text).split(/\r?\n/);
  remainder = lines.pop();
  for (const line of lines) {
    if (/error:|Missing class|Unexpected export|build task\(.+\) in|Build success/i.test(line)) console.log(line);
  }
}
child.stdout.on('data', output);
child.stderr.on('data', output);
child.once('error', error => { console.error(error.message); log.end(); process.exitCode = 1; });
child.once('exit', code => {
  child.stdout.destroy();
  child.stderr.destroy();
  log.end();
  const success = code === 36 || code === 0;
  console.log((success ? 'Built ' : 'Build failed: ') + target + ' (Creator exit ' + code + ')');
  console.log('Log: ' + destination);
  process.exitCode = success ? 0 : 1;
});