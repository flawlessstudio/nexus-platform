test('extra6 snapshot', () => {
  const data = { numbers: [10, 20, 30], sum: 60 };
  expect(data).toMatchSnapshot();
});
