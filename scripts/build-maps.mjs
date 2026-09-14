import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, cpSync, symlinkSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const repo = path.resolve(process.env.MAPLIBRE_REPO || path.join(root, '../maplibre-gl-js'));
const revisions = {before: process.env.BEFORE_REF || '004a7a7f5^', after: process.env.AFTER_REF || 'HEAD'};
const manifest = {};
for (const [name, ref] of Object.entries(revisions)) {
    const commit = execFileSync('git', ['rev-parse', ref], {cwd: repo, encoding: 'utf8'}).trim();
    const directory = mkdtempSync(path.join(tmpdir(), 'raster-fade-build-'));
    try {
        const archive = execFileSync('git', ['archive', commit], {cwd: repo, maxBuffer: 200 * 1024 * 1024});
        execFileSync('tar', ['-x', '-C', directory], {input: archive});
        symlinkSync(path.join(repo, 'node_modules'), path.join(directory, 'node_modules'));
        for (const task of ['generate-unicode-data', 'generate-shaders', 'generate-struct-arrays', 'generate-style-code', 'build-dev', 'build-css']) {
            execFileSync('npm', ['run', task], {cwd: directory, stdio: 'inherit'});
        }
        const destination = path.join(root, 'vendor', name);
        mkdirSync(destination, {recursive: true});
        cpSync(path.join(directory, 'dist'), destination, {recursive: true});
        cpSync(path.join(directory, 'LICENSE.txt'), path.join(destination, 'LICENSE.txt'));
        manifest[name] = {ref, commit};
    } finally {
        rmSync(directory, {recursive: true, force: true});
    }
}
writeFileSync(path.join(root, 'vendor/builds.json'), JSON.stringify(manifest, null, 2) + '\n');
