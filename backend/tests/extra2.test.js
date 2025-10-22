test('extra2 snapshot', () => {
  const data = { name: 'extra2', items: [1, 2, 3], meta: { ok: true } };
  expect(data).toMatchSnapshot();
});
