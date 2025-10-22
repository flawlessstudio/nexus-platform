test('extra5 snapshot', () => {
  const data = { user: { id: 'u1', roles: ['admin'] }, active: false };
  expect(data).toMatchSnapshot();
});
