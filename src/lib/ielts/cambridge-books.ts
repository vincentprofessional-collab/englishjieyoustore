export const CAMBRIDGE_BOOKS = Array.from({ length: 18 }, (_, index) => {
  const bookNo = index + 4;
  return {
    code: `cambridge-${bookNo}`,
    number: bookNo,
    shortTitle: `CI${bookNo}`,
    title: `剑桥雅思 ${bookNo}`,
  };
});
