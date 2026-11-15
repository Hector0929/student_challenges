/** 星幣數字加千分位（1424644979 → 1,424,644,979） */
export const formatStars = (n: number | null | undefined) => (Number(n) || 0).toLocaleString('zh-TW');
