function closeEnough(prev, cur, next) {
  return calcHaversine(prev, cur) <= 25 && calcHaversine(cur, next) <= 25
}

function calcHaversine(point1, point2) {
  let degToRad = (deg) => deg * Math.PI / 180
  const R = 6371e3
  const φ1 = degToRad(point1.latitude)
  const φ2 = degToRad(point2.latitude)
  const Δφ = (φ2-φ1)
  const Δλ = (degToRad(point2.longitude)-degToRad(point1.longitude))

  const a = Math.pow(Math.sin(Δφ/2),2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.pow(Math.sin(Δλ/2), 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const d = R * c;
  return d
}

module.exports = function(gpsData) {

  let pruned = []

  for (var i = 0; i < gpsData.length; i++) {
    const prev = gpsData[i-1]
    const cur = gpsData[i]
    const next = gpsData[i+1]

    if (!prev || !next) continue

    if (closeEnough(prev, cur, next)) { pruned.push(cur) }
  }
  return pruned

}

