test('extra4 snapshot', () => {
  const data = { status: 'ok', payload: { id: 'x', amount: 42 } };
  expect(data).toMatchSnapshot();
});
