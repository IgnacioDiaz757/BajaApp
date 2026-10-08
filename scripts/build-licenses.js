// Genera src/legal/licenses.json (pantalla "Código abierto") a partir de las dependencias directas del proyecto
// más las librerías que se incluyen dentro de los juegos (assets/games/*/vendor).
//
// Uso:  node scripts/build-licenses.js

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const entries = Object.keys(pkg.dependencies).sort().map((name) => {
  const info = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8'));
  return { name, version: info.version, license: info.license };
});

// Librerías copiadas dentro de los juegos (no son dependencias de npm del proyecto)
entries.push({ name: 'three.js (Night Chase)', version: '0.128.0', license: 'MIT' });

fs.writeFileSync(path.join(root, 'src/legal/licenses.json'), `${JSON.stringify(entries, null, 2)}\n`);
console.log(`licenses.json: ${entries.length} entradas`);
