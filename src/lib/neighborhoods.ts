// Approximate centers; a spot's public pin is placed near its neighborhood, never at the address.
export const NEIGHBORHOODS: Record<string, [number, number]> = {
  "רמת אביב": [32.1133, 34.8044],
  "בבלי": [32.0947, 34.7967],
  "הצפון הישן": [32.0880, 34.7770],
  "הצפון החדש": [32.0905, 34.7860],
  "לב העיר": [32.0700, 34.7740],
  "מונטיפיורי (ליד איכילוב)": [32.0690, 34.7880],
  "נווה צדק": [32.0610, 34.7650],
  "פלורנטין": [32.0565, 34.7690],
  "יפו": [32.0520, 34.7560],
  "יד אליהו (ליד מנורה)": [32.0560, 34.7930],
};

export function publicPin(neighborhood: string): [number, number] {
  const [lat, lng] = NEIGHBORHOODS[neighborhood] ?? NEIGHBORHOODS["לב העיר"];
  const jitter = () => (Math.random() - 0.5) * 0.004;
  return [lat + jitter(), lng + jitter()];
}
