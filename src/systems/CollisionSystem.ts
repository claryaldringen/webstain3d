export function checkCollision(
  px: number,
  pz: number,
  radius: number,
  isSolid: (tx: number, ty: number) => boolean,
  tileSize: number,
): boolean {
  const minTX = Math.floor((px - radius) / tileSize);
  const maxTX = Math.floor((px + radius) / tileSize);
  const minTZ = Math.floor((pz - radius) / tileSize);
  const maxTZ = Math.floor((pz + radius) / tileSize);

  for (let ty = minTZ; ty <= maxTZ; ty++) {
    for (let tx = minTX; tx <= maxTX; tx++) {
      if (isSolid(tx, ty)) {
        const closestX = Math.max(tx * tileSize, Math.min(px, (tx + 1) * tileSize));
        const closestZ = Math.max(ty * tileSize, Math.min(pz, (ty + 1) * tileSize));
        const distX = px - closestX;
        const distZ = pz - closestZ;
        if (distX * distX + distZ * distZ < radius * radius) {
          return true;
        }
      }
    }
  }
  return false;
}
