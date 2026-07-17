export const retryCount = 20;

export function getTimeGapInMilliSec(): number {
  const min = 100;
  const max = 1000;
  const res = Math.random() * (max - min) + min;
  return res;
}
