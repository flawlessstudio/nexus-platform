test('extra1 snapshot', () => {
  const data = { name: 'extra1', value: 1, ts: '<TS>' };
  expect(data).toMatchSnapshot();
});
