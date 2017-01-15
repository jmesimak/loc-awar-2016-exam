const fs = require('fs')
const _ = require('lodash')
const tokml = require('tokml')

const velocityPrune = require('./velocity-prune')
const poi = require('./poi')

const spatialData = './spatial-analysis-data/buenosaires.csv'

function filterInaccurate(row) {
  return row[3] > 3 && row[4] < 6
}

function transformDataToCoordinates(data) {
  return data
    .toString()
    .split('\n')
    .map((row) => row.split(',').map(Number))
}

function convertToGeoJSONObjects(row) {
  return {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [row[0], row[1]]
    },
    "properties": {
      "name": ""
    }
  }
}

function convertToGeoJSONObjectsByObj(o) {
  return {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [o.latitude, o.longitude]
    },
    "properties": {
      "name": ""
    }
  }
}

function constructGeoJSON(geoJSONObjects) {
  let geojson = {}
  geojson.features = geoJSONObjects
  geojson.type = "FeatureCollection"; 
  return geojson
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

function readData() {
  return new Promise((resolve, reject) => {
    fs.readFile(spatialData, (err, data) => {

      const allCoordinatesRaw = transformDataToCoordinates(data)
      const filteredCoordinatesRaw = allCoordinatesRaw.filter(filterInaccurate)

      const velocityPrunedCoordinates = velocityPrune(filteredCoordinatesRaw.map(rawCoordinatesToLocations))

      const filteredCoordinates = filteredCoordinatesRaw.map(convertToGeoJSONObjects)
      const allCoordinates = allCoordinatesRaw.map(convertToGeoJSONObjects)
      const velocityCoordinates = velocityPrunedCoordinates.map(convertToGeoJSONObjectsByObj)

      const geojsonAll = constructGeoJSON(allCoordinates)
      const geojsonFiltered = constructGeoJSON(filteredCoordinates)
      const geojsonVelocityPruned = constructGeoJSON(velocityCoordinates)

      const kmlAll = tokml(geojsonAll)
      const kmlFiltered = tokml(geojsonFiltered)
      const kmlVelocityPruned = tokml(geojsonVelocityPruned)

      fs.writeFile('spatial-points-all.kml', kmlAll, (err) => {
        if (!err) console.log("Wrote all points.kml");
      });

      fs.writeFile('spatial-points-filtered.kml', kmlFiltered, (err) => {
        if (!err) console.log("Wrote filtered points.kml");
      });

      fs.writeFile('velocity-pruned-points.kml', kmlVelocityPruned, (err) => {
        if (!err) console.log("Wrote velocity pruned points");
      });

      formClusters(filteredCoordinatesRaw)
    })
  })
}

function rawCoordinatesToLocations(coordinates) {
  return {
    latitude: coordinates[0],
    longitude: coordinates[1],
    timestamp: new Date(coordinates[2] * 1000),
    satellites: coordinates[3],
    hdop: coordinates[4]
  }
}

function clustersContainingOneOfThePoints(clusters, cluster) {
  return clusters.filter((toSearch) => {
    cluster.forEach((point) => {
      if (toSearch.indexOf(point) !== -1) {
        return true
      }
    })
    return false
  })
}

function calculateClusterCentroid(points) {
  let sums = points.reduce((acc, cur) => {
    acc.lat += cur.latitude
    acc.lon += cur.longitude
    return acc
  },{lat: 0, lon: 0})
  sums.lat = sums.lat / points.length
  sums.lon = sums.lon / points.length
  return {latitude: sums.lat, longitude: sums.lon}
}

function containsClusterWithinCentroidThreshold(clusters, centroid, threshold) {
  return clusters.filter((cluster) => calcHaversine(cluster.centroid, centroid) <= threshold).length > 0
}

function formClusters(rawCoordinates) {
  console.log(`Searching for places from ${rawCoordinates.length} coordinates`)
  const locations = rawCoordinates.map(rawCoordinatesToLocations)
  const neighborThreshold = 50
  const minNeighbors = 5
  const clusterCentroidDistanceThreshold = 100

  const clusters = locations
    .map((location) => {
      const cluster = locations.filter((loc) => calcHaversine(location, loc) <= 50)
      if (cluster.length >= minNeighbors) return cluster
      return []
    })
    .filter((points) => points.length > 0)
    .map((points) => {
      return {
        points: points
      }
    })
    .map((cluster) => {
      cluster.centroid = calculateClusterCentroid(cluster.points)
      return cluster
    })


  let finalClusters = []
  clusters.forEach((cluster) => {
    if (!containsClusterWithinCentroidThreshold(finalClusters, cluster.centroid, clusterCentroidDistanceThreshold)) finalClusters.push(cluster)
  })

  const placeGeoJsons = finalClusters
    .map((cluster) => [cluster.centroid.latitude, cluster.centroid.longitude])
    .map(convertToGeoJSONObjects)

  const placesGeoJson = constructGeoJSON(placeGeoJsons)


  fs.writeFile('pruned-cluster-centroids.kml', tokml(placesGeoJson), (err) => {
    if (!err) console.log("Wrote filtered pruned-cluster-centroids.kml");
  });

  poi.linkClustersToLocations(finalClusters)

}

readData()