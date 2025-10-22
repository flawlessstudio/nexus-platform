test('extra8 snapshot', () => {
  const data = { nested: { a: 1, b: { c: 2 } } };
  expect(data).toMatchSnapshot();
});
