const fs = require('fs')
const _ = require('lodash')

function convertCsv(data, loc) {
  const rows = data.toString().split('\n').map((row) => row.split(',').map(Number))

  if (!loc) return rows;

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

readData()
  .then((data) => {
    data.testData.map((td) => {
      td.location = Number(getKClosest(data.trainingData.readings, td, 5))
    }) 

    let truthValues = data.testData.map((td, idx) => {
      const realClass = data.trainingData.readings[idx].location
      return td.location === realClass
    })

    let correct = truthValues.reduce((acc, cur) => { return acc + cur }, 0)
    console.log(correct/data.testData.length)
  })


