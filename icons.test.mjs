import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('./manifest.webmanifest', import.meta.url), 'utf8'));
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

function checkPng(src, size) {
  const png = readFileSync(new URL(src, import.meta.url));
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(png.readUInt32BE(16)).toBe(size);
  expect(png.readUInt32BE(20)).toBe(size);
  expect(sw).toContain(`'${src}'`);
}

test('Android has correctly sized PNG icons, including a maskable icon', () => {
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((entry) => entry.type === 'image/png' && entry.sizes === `${size}x${size}`);
    expect(icon).toBeDefined();
    expect(icon.purpose.split(' ')).toContain('any');
    checkPng(icon.src, size);
  }
  expect(manifest.icons.some((icon) => icon.type === 'image/png' && icon.sizes === '512x512' && icon.purpose.split(' ').includes('maskable'))).toBe(true);
});

test('iPhone has a 180px Apple touch icon available offline', () => {
  expect(html).toContain('<link rel="apple-touch-icon" href="./images/apple-touch-icon.png" sizes="180x180" />');
  checkPng('./images/apple-touch-icon.png', 180);
});
