import { promises as fs } from 'fs';
import path from 'path';

async function main() {
  const root = path.resolve(__dirname, '../../brands');
  const entries = await fs.readdir(root);
  await fs.writeFile(path.resolve(__dirname, '../../brands/index.json'), JSON.stringify(entries, null, 2));
  console.log('Brand index generated');
}

main();
