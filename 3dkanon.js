const _ = require('lodash')

const coordsString = "0.2037 0.0394 0.1639 0.2264 0.2426 0.0089 0.0317 0.2393 0.2123 0.2283 0.1213 0.2335 0.1581 0.2001 0.1697 0.0244 0.0355 0.1894 0.0696 0.1054 0.1858 0.1367 0.2289 0.0981 0.2394 0.1981 0.1639 0.2412 0.2399 0.0428"
const coords = _.chunk(coordsString
                        .split(' ')
                        .map(Number),
                        3)
                .map((row) => { return {x: row[0], y: row[1], z: row[2]}})

function isPointInsideSphere(point, sphere) {
  var distance = Math.sqrt((point.x - sphere.x) * (point.x - sphere.x) +
                           (point.y - sphere.y) * (point.y - sphere.y) +
                           (point.z - sphere.z) * (point.z - sphere.z));
  return distance < sphere.radius;
}

function findThreshold() {
  let r = 0.0000
  let finished = false
  while (!finished) {
    r += 0.0001
    finished = _.every(coords.map((point) => {
      point.radius = r
      let inSphere = coords.filter((p) => isPointInsideSphere(p, point))
      return inSphere.length >= 4
    }), Boolean)

  }
  console.log(`found a good radius: ${r}`)
}

function calcNeighbourhoods(minpts, eps) {
  let filtered = coords.filter((point) => {
      point.radius = eps
      let inSphere = coords.filter((p) => isPointInsideSphere(p, point))
      return inSphere.length >= minpts
  })
  console.log(filtered)
}

findThreshold()
calcNeighbourhoods(4, 0.15)