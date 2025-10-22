test('extra3 snapshot', () => {
  const data = { ok: true, list: ['a', 'b', 'c'], n: 3 };
  expect(data).toMatchSnapshot();
});
