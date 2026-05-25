const mazeData = Array.from({ length: 35 }, () =>
  Array.from({ length: 35 }, () => (Math.random() < 0.28 ? 1 : 0)),
);

// =========================
// BORDURES FERMÉES
// =========================
mazeData[0].fill(1);

mazeData[mazeData.length - 1].fill(1);

mazeData.forEach((row) => {
  row[0] = 1;
  row[row.length - 1] = 1;
});

export default mazeData;
