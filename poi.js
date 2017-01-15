const request = require('request')

const API_ROOT = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?"

function getMostImportantPOI(latitude, longitude, radius) {

  return new Promise((resolve, reject) => {
    const searchString = API_ROOT + `key=${process.env.PLACES_API}&location=${latitude},${longitude}&radius=${radius}`
    request(searchString, (err, response, body) => {
      let answ = JSON.parse(body).results
      resolve(answ[1])
    })
  })
}

function linkClustersToLocations(clusters) {
  clusters.forEach((cluster) => {
    getMostImportantPOI(cluster.centroid.longitude, cluster.centroid.latitude, 50)
      .then((place) => {
        if (place) console.log(`${place.name}, at ${cluster.centroid.longitude}, ${cluster.centroid.latitude}`)
      })
  })
}

module.exports = {
  getMostImportantPOI: getMostImportantPOI,
  linkClustersToLocations: linkClustersToLocations
}

