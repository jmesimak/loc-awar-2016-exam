const fs = require('fs')
const _ = require('lodash')

const distances = {
  45: {47: 10.6434, 51: 5.5682, 80: 19.0625, 96: 27.8739},
  47: {51: 15.2212, 80: 21.8397, 96: 29.6435},
  51: {80: 15.8387, 96: 24.5509},
  80: {96: 8.8236},
  96: {}
}

function fillMissing() {
  Object.keys(distances).forEach((d) => {
    Object.keys(distances).forEach((d2) => {
      if (!distances[d][d2] && d !== d2) {
        distances[d][d2] = distances[d2][d]        
      }
    })
  })
}

fillMissing()

function convertCsv(data, loc) {
  const rows = data.toString().split('\n').map((row) => row.split(',').map(Number))

  if (!loc) return rows.map((r) => { return { vals: r }});

  const readings = rows.map((row) => {
    let location = row[row.length-1]
    let vals = row.slice(0, row.length-1)
    return {
      location: location,
      vals: vals
    }    
  })

  let locations = readings.reduce((acc, item) => {
    if (!acc[item.location]) {
      acc[item.location] = []
    }
    acc[item.location].push(item.vals)
    return acc
  }, {})
  return {readings: readings, locations: locations}
}

function readTrainingLocations()  {
  return new Promise((resolve, reject) => {
    fs.readFile('./fingerprinting-data/exam_train.csv', (err, data) => {
      resolve(convertCsv(data, true))
    })
  })
}

function readTestLocations()  {
  return new Promise((resolve, reject) => {
    fs.readFile('./fingerprinting-data/exam_test.csv', (err, data) => {
      resolve(convertCsv(data, false))
    })
  })
}

function readData() {
  return new Promise((resolve, reject) => {
    readTrainingLocations()
      .then((trainingData) => {
        readTestLocations()
          .then((testData) => {
            resolve({trainingData: trainingData, testData: testData})
          })
      })
  })
}

function getKClosest(trainingSet, sample, k) {
  trainingSet.forEach((location) => {
    const d = calcDistance(location.vals, sample)
    location.dist = d
  })
  
  let sorted = _.orderBy(trainingSet, 'dist')
  let topLocations = _.countBy(sorted.slice(0, k).map((loc) => loc.location))
  return _.orderBy(Object.keys(topLocations).map((loc) => {
    return { location: loc, occurrences: topLocations[loc] }
  }), 'occurrences')[0].location
}

function calcDistance(row1, row2) {
  let dist = 0
  for (var i = 0; i < row1.length; i++) {
    let r1v = row1[i] * -1
    let r2v = row2[i] * -1
    dist += Math.abs(r1v-r2v)
  }
  return dist
}

function getBaseLog(x, y) {
  return Math.log(y) / Math.log(x);
}

function hyperbolicFingerprint(data) {
  let row = []
  for (var i = 0; i < data.length; i++) {
    for (var j = i + 1; j < data.length; j++) {
      const x = data[i] !== 0 ? data[i] : -100
      const y = data[j] !== 0 ? data[j] : -100
      const div = Math.abs(x / y)
      let measure = getBaseLog(2, div)
      if (x === -100 && y === -100) measure = 1
      row.push(measure)
    }
  } 
  return row
}

function calcHyperbolicFingerprints(trainingSet, testSet) {
  trainingSet.forEach((ts) => {
    ts.hyperbolic = hyperbolicFingerprint(ts.vals)
  })

  testSet.forEach((td) => {
    td.hyperbolic = hyperbolicFingerprint(td.vals)
  })
}

function getKClosestHyperbolic(trainingSet, sample, k) {
  trainingSet.forEach((location) => {
    const d = calcDistance(location.hyperbolic, sample.hyperbolic)
    location.dist = d
  })
  
  let sorted = _.orderBy(trainingSet, 'dist')
  let topLocations = _.countBy(sorted.slice(0, k).map((loc) => loc.location))
  return _.orderBy(Object.keys(topLocations).map((loc) => {
    return { location: loc, occurrences: topLocations[loc] }
  }), 'occurrences')[0].location
}

function calcHyperbolicLocations(trainingSet, testSet) {
  let correct = 0
  testSet.forEach((testItem, index) => {
    testItem.location = Number(getKClosestHyperbolic(trainingSet, testItem, 5))
    const trueLoc = trainingSet[index].location
    if (testItem.location === trueLoc) correct++
  })
  console.log(`Hyperbolic fingerprint accuracy: ${Math.round(correct / testSet.length * 100)}%`)

}



readData()
  .then((data) => {
    data.testData.map((td) => {
      td.location = Number(getKClosest(data.trainingData.readings, td.vals, 5))
    }) 

    const truthValues = data.testData.map((td, idx) => {
      const realClass = data.trainingData.readings[idx].location
      return td.location === realClass
    })

    const correct = truthValues.reduce((acc, cur) => { return acc + cur }, 0)
    console.log(`Correct test set classifications: ${correct/data.testData.length*100}%`)

    const distError = data.testData.reduce((acc, td, idx) => {
      const realClass = data.trainingData.readings[idx].location
      let d = 0
      if (realClass !== td.location) {
        d += distances[td.location][realClass]
      }
      return acc + d
    }, 0)
    const avgDistError = distError / data.testData.length
    const avgDistErrorPretty = Math.round(avgDistError * 100) / 100
    console.log(`Average distance error: ${avgDistErrorPretty} meters`)

    calcHyperbolicFingerprints(data.trainingData.readings, data.testData)
    calcHyperbolicLocations(data.trainingData.readings, data.testData)
    
  })


