export const translateMock = (p: string) => {
  if (p === 'about.copyright') {
    return String([
      '1 text translated line 1',
      '2 text translated line 2',
      '3 text translated line 3',
      '4 text translated line 4',
      '5 text translated line 5',
    ]);
  } else {
    return 'text translated';
  }
};
