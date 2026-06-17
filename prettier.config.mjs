export default {
  plugins: ['prettier-plugin-astro'],
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'all',
  endOfLine: 'auto',
  overrides: [{ files: '*.astro', options: { parser: 'astro' } }],
};
