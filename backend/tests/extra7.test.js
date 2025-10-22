test('extra7 snapshot', () => {
  const data = { msg: 'hello', lang: 'en' };
  expect(data).toMatchSnapshot();
});
