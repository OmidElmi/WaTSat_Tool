//
// Script of the WaTSat algorithm. An Automatic Google Earth Engine Tool for Generating  Lake Water Area Time Series from Satellite Imagery
//
// The user provides lake coordinates, time period, and other parameters. 
// The script performs search area modification, lake boundery delination and generating water area time series. 
//
// Input: Lake coordinates, monitoring period, buffer size, etc.
// Output: Time series of lake water area with optional smoothing and blunder detection.
//
//
// Publication: An Automatic Google Earth Engine Tool for Generating Lake Water Area Time Series from Satellite Imagery,
///             IEEE Geoscience and Remote Sensing Letters
// Authors: Omid Elmi (omid.elmi@gis.uni-stuttgart.de), Amirhossein Ahrari (Amirhossein.Ahrari@oulu.fi)
// Date: 08.01.2025




// Lake coordinates in [°] (either by selecting on the map or writing them down here)
// For generating the water area time series of more than one lake, write teh coordiante of each lake in the following line
// Exmaple: 
// var lakeCoordinates = [
//  [Lon_Lake1,Lat_Lake1], 
//  [Lon_Lake2, Lat_Lake2],
//  [Lon_Lake3,Lat_Lake3]
//];
var lakeCoordinates = [
  [43.236,33.98 ], 
  [42.349, 34.325 ],
  [45.01,34.2]
];

// Define monitoring period (year)
var time_start = '2023'
var time_end = '2025'
//var time_end = (new Date().getFullYear() + 1).toString();

// Define buffer size (radius of buffer) km
var buffer_size = 5 
// Define threshold for generating constant water mask [%]
var const_water_thr = 98
// Define threshold for generating constant land mask [%]
var const_land_thr = 2
// Define the acceptance rate for cloud coverage [%]
var cloud_cover = 10
// number of day for removing the cloud
var cloud_smoothing_window = 25

// Applying blunder detection and smoothing to the time series (these filters may cause the algorithm to perform slowly!)
// 3 sigma blunder detection algorithm
var Blunder_Detection='no' // 'yes' or 'no'
// Moving average algorithm
var Moving_Average_Mean = 'no' // 'yes' or 'no'
// Moving median algorithm
var Moving_Average_Median = 'no' // 'yes' or 'no'
// Defining the window size for moving average or moving median smoothing filter
var windowSize=3 // the size of the moving average window e.g. 3, 5


  // Check if geometry is defined and override lakeCoordinates only if available
if (typeof geometry !== 'undefined' && geometry !== null) {
   var lakeCoordinates = geometry.coordinates().getInfo().map(function(coord) {
    return [coord[0], coord[1]]; // Swap to match [latitude, longitude]
  });
}
 
// Import required image collections and datasets
var imageCollection = ee.ImageCollection("MODIS/061/MOD09Q1"),
    JRC_OCC = ee.Image("JRC/GSW1_4/GlobalSurfaceWater");
// call the lakes border using hydrolake layer (awosome google earth engine data catalog)
var lake = ee.FeatureCollection('projects/sat-io/open-datasets/HydroLakes/lake_poly_v10'); 
  
// Iterate through the array of coordinates
lakeCoordinates.forEach(function(coords) {
  var Lake_lat = coords[1];
  var Lake_lon = coords[0];

print('Generating Lake Water Area Time Series for the Lake at:\nLat: ' + Lake_lat.toFixed(4) + '\nLon: ' + Lake_lon.toFixed(4));

  // Define the geometry for the current point
  var geometry = ee.Geometry.Point([Lake_lon, Lake_lat]);

  try {


try{// Check if geometry is defined, if not, create it using the given coordinates
if (typeof geometry === 'undefined') {
    var geometry = ee.Geometry.Point([Lake_lon, Lake_lat]);
  } 
}catch (e) {
print('Please select a lake!');
} 
if (typeof geometry !== 'undefined') {

//
//


// simplification and drawing buffer for the lake borders utlizing in the computations
var roi = lake.filterBounds(geometry).map(function(feature){
  return feature.buffer(ee.Number(buffer_size).multiply(1000)).simplify(1000)
  }).filter(ee.Filter.neq('Lake_name','Caspian Sea'))
  
try{
Map.centerObject(roi);

var roi_area = ee.Number(roi.geometry().area(1))


// image collection import (mod09q1)
var modis =  imageCollection.select(['sur_refl_b02','State'])
.filterDate(time_start, time_end)

// constant water and land masks generation (modifying the search area)
var jrc_thr = JRC_OCC.select('occurrence').lt(ee.Number(const_water_thr)).and(JRC_OCC.select('occurrence').gt(ee.Number(const_land_thr)))
var jrc_main_body = jrc_thr.not(); 
var jrc_main_body_mask = jrc_main_body.updateMask(jrc_main_body);
var jrc_main_body_area = jrc_main_body_mask.multiply(ee.Image.pixelArea().divide(1e6));
var jrc_center_area = ee.Number(jrc_main_body_area.reduceRegion({
  reducer: ee.Reducer.sum(), geometry: roi, scale: 250
  }).values().get(0))

var days = ee.Number(cloud_smoothing_window); 
var millis = ee.Number(days).multiply(1000 * 24 * 3600); 
var filter = ee.Filter.maxDifference({difference: millis, leftField: 'system:time_start', rightField: 'system:time_start'});
var join = ee.Join.saveAll({matchesKey: 'images'})
var join_data = ee.ImageCollection(join.apply(modis.select(0), modis.select(0), filter))
var smoothed_col = join_data.map(function(img){
  var images = ee.ImageCollection.fromImages(img.get('images'))
  var median_images = images.reduce(ee.Reducer.median().setOutputs(['moving_median']))
  return median_images
  .copyProperties(img, ['system:time_start', 'system:time_end'])
  })
  
var modis_col = modis.linkCollection(smoothed_col, ['sur_refl_b02_moving_median'])

function bitwise_extract(value, from_bit, to_bit){
   if (to_bit === undefined) to_bit =  from_bit;
   var mask_size = ee.Number(1).add(to_bit).subtract(from_bit);
   var mask = ee.Number(1).leftShift(mask_size).subtract(1);
   return value.rightShift(from_bit).bitwiseAnd(mask)
  }

function cloud_mask(img){
  var mov_ave = img.select('sur_refl_b02_moving_median')
  var state = img.select('State')
  var cloud = bitwise_extract(state,0,1)
  var shadow = bitwise_extract(state,2)
  var cloud_region = cloud.eq(2).or(cloud.eq(1))
  var cloud_region_mask = cloud_region.updateMask(cloud_region);
  var cloud_pixel_area = cloud_region_mask.multiply(ee.Image.pixelArea())
  var cloud_area = ee.Number(cloud_pixel_area.reduceRegion({
    reducer: ee.Reducer.sum(), geometry: roi,scale: 250
    }).values().get(0))
  var cloud_percent = ((cloud_area).divide(roi_area)).multiply(100)
  var condition = cloud.eq(2).or(cloud.eq(1)).or(shadow.eq(1))
  var mask = img.select('sur_refl_b02').updateMask(condition.not()).unmask(mov_ave)
  return mask.updateMask(jrc_thr)
  .set('cloud_percent',cloud_percent) 
  }
var modis_mask = modis_col.map(cloud_mask).select('sur_refl_b02') 
.filter(ee.Filter.lt('cloud_percent',ee.Number(cloud_cover))) 


// lake boundary delineation
var modis_his = modis_mask.map(function(img){
  var his = img.reduceRegion({
  reducer: ee.Reducer.histogram(255, 2)
      .combine('mean', null, true)
      .combine('variance', null, true), 
  geometry: roi, 
  scale: 250,
  bestEffort: true
  });
  var threshold = otsu(his.get('sur_refl_b02_histogram'));
  
  return img
  .copyProperties(img, img.propertyNames())
  .set('threshold', threshold)
  })

// post processing
var mod_area = modis_his.map(function(img){
  var thr = ee.Number(img.get('threshold'))
  var img_thr = img.lt(thr);
  var img_mask = img_thr.updateMask(img_thr);
  var img_area = img_mask.multiply(ee.Image.pixelArea().divide(1e6));
  var border_area = ee.Number(img_area.reduceRegion({
    reducer: ee.Reducer.sum(),geometry: roi, scale: 250
    }).values().get(0))
  var lake_area = border_area.add(jrc_center_area)
  var date = img.date().format('YYYY-MM-dd')
  return img_area 
  .copyProperties(img, img.propertyNames())
  .set('lake_area', lake_area) 
  .set('date',ee.String(date))
  })
var area = mod_area.aggregate_array('lake_area')
var date = mod_area.aggregate_array('date');
var areaList = area.getInfo();

if (Blunder_Detection === 'yes'){
  // Perform blunder detection
  var cleanedData = blunderDetection(areaList, date, windowSize);
   // Use cleaned time series and dates
   var area = cleanedData.cleaned_series;
   var date = cleanedData.cleaned_dates;
   print(ui.Chart.array.values({
    array: area,
    axis: 0,
    xLabels: cleanedData.cleaned_dates
  }).setOptions({
    title: 'Lake Water Area Time Series After Applying Blunder Detection',
    pointSize: 2,
    vAxis: {title: 'km2'},
    series: {0:{color:'skyblue'}},
    lineWidth: 1
  }));
}
if (Moving_Average_Median === 'yes') {
  var areaList = area.getInfo();  
  var area_smooth=movMedian(areaList, windowSize)
  print(ui.Chart.array.values({
    array: area_smooth,  
    axis: 0,
    xLabels: date
  }).setSeriesNames(['Water Area'])
  .setOptions({
    title: 'Lake Water Area Time Series Smoothed with Moving Median Filter',
    titleTextStyle: {fontSize: 14, bold: true, alignment: 'center'}, 
    pointSize: 2,
    vAxis: { title: 'km²', titleTextStyle: { italic: false } },
    series: {0:{color:'skyblue'}},
    lineWidth: 1
  }));
}
if (Moving_Average_Mean === 'yes') {
  var areaList = area.getInfo();  
  var area_smooth=movAve(areaList, windowSize)
  print(ui.Chart.array.values({
    array: area_smooth,  
    axis: 0,
    xLabels: date
  }).setSeriesNames(['Water Area'])
    .setOptions({
    title: 'Lake Water Area Time Series Smoothed with Moving Mean Filter',
    titleTextStyle: {fontSize: 14, bold: true, alignment: 'center'}, 
    pointSize: 2,
    vAxis: { title: 'km²', titleTextStyle: { italic: false } },
    series: {0:{color:'lightblue'}},
    lineWidth: 1
  }));
}
if (Moving_Average_Median === 'no' && Moving_Average_Mean === 'no') {
  var areaList = area.getInfo();  
  print(ui.Chart.array.values({
    array: areaList,  
    axis: 0,
    xLabels: date
  }).setSeriesNames(['Water Area'])
     .setOptions({
    title: 'Lake Water Area Time Series',
    titleTextStyle: {fontSize: 14, bold: true, alignment: 'center'}, 
    pointSize: 4,
    vAxis: { title: 'km²', titleTextStyle: { italic: false } }, 
    series: {0:{        color: 'lightblue'    }},
    lineWidth: 1
  }));
}

}catch (e) {print("The selected point does not correspond to a lake or is not part of the HydroLake dataset. Please choose a valid lake location."

);}

function movAve_new(value, windowSize) {
  var halfWindow = Math.floor(windowSize / 2);
  var valueList = ee.List(value); // Ensure the input is an ee.List

  return valueList.map(function(element, index) {
    index = ee.Number(index); // Ensure the index is an ee.Number
    var start = index.subtract(halfWindow).max(0); // Start index of the window
    var end = index.add(halfWindow).min(valueList.size().subtract(1)); // End index of the window

    // Get the window as a list and calculate the mean
    var window = valueList.slice(start, end.add(1)); // Add 1 to include the end index
    var mean = window.reduce(ee.Reducer.mean());

    return mean;
  });
}
function movAve(value, windowSize) {
  var halfWindow = Math.floor(windowSize / 2);
  var newValue = value.slice(); // Create a copy of the array

  for (var i = 0; i < value.length; i++) {
    var sum = 0;
    var count = 0;

    for (var j = -halfWindow; j <= halfWindow; j++) {
      var index = i + j;
      if (index >= 0 && index < value.length) {
        sum += value[index];
        count++;
      }
    }

    newValue[i] = sum / count;
  }

  return newValue;
}

// Blunder detection function
function blunderDetection(time_series, dates, window_size) {
  time_series = ee.List(time_series);
  dates = ee.List(dates);
  
  // Step 1: Calculate moving average using movAve function
 // var moving_avg = movAve(time_series, window_size);
  var moving_avg = movAve_new(time_series, window_size);

  // Step 2: Calculate residuals (differences)
  var Res = time_series.zip(moving_avg).map(function(pair) {
    var original = ee.Number(ee.List(pair).get(0));
    var avg = ee.Number(ee.List(pair).get(1));
    return original.subtract(avg); // Calculate difference instead of absolute difference
  });

  var pass = 1;
  while (pass === 1) {
    
    // Step 3: Calculate mean and standard deviation of residuals
    var meanResidual = ee.Array(Res).reduce(ee.Reducer.mean(), [0]).get([0]);
    var stdDevResidual = ee.Array(Res).reduce(ee.Reducer.stdDev(), [0]).get([0]);

    // Step 4: Subtract mean from all residuals and store in a separate list
    var meanSubtractedRes = Res.map(function(residual) {
      return ee.Number(residual).subtract(meanResidual);
    });

    // Step 5: Identify residual with the largest absolute value and its index
    var absRes = meanSubtractedRes.map(function(residual) {
      return ee.Number(residual).abs();
    });
    var maxAbsResidual = ee.List(absRes).reduce(ee.Reducer.max());
    var maxIndex = absRes.indexOf(maxAbsResidual);
    var isBlunder = ee.Number(maxAbsResidual).gt(stdDevResidual.multiply(3));

    // Step 6: Check if this maximum residual is larger than 3 standard deviations
    if (isBlunder) {
      // Remove the blunder from time series, dates, and residuals
      time_series = time_series.remove(maxIndex);
      dates = dates.remove(maxIndex);
      Res = Res.remove(maxIndex);
    } else {
      // Exit loop if no more blunders detected
      pass = 0;
    }
  }

  // Return cleaned time series and dates
  return {
    cleaned_series: time_series,
    cleaned_dates: dates
  };
}
function movAve_sim(value) {
  for (var i = 1; i < value.length - 1; i++) {
    value[i] = (value[i - 1] + value[i] + value[i + 3]) / 3;
  }
  return value;
}

function movMedian(value, windowSize) {
  var halfWindow = Math.floor(windowSize / 2);
  var newValue = value.slice(); // Create a copy of the array

  for (var i = 0; i < value.length; i++) {
    var window = [];

    for (var j = -halfWindow; j <= halfWindow; j++) {
      var index = i + j;
      if (index >= 0 && index < value.length) {
        window.push(value[index]);
      }
    }

    // Sort the window values
    window.sort(function(a, b) { return a - b; });

    // Calculate median based on even or odd window size
    var windowSizeAdjusted = window.length;
    var median;
    if (windowSizeAdjusted % 2 === 0) {
      // If even number of elements, take the average of the middle two
      var midIndex1 = windowSizeAdjusted / 2 - 1;
      var midIndex2 = windowSizeAdjusted / 2;
      median = (window[midIndex1] + window[midIndex2]) / 2;
    } else {
      // If odd number of elements, take the middle value
      var midIndex = Math.floor(windowSizeAdjusted / 2);
      median = window[midIndex];
    }

    // Update the new value array with the median
    newValue[i] = median;
  }

  return newValue;
}
}

function otsu(histogram) {
   histogram=ee.Dictionary(histogram);
   var counts=ee.Array(histogram.get('histogram'));
   var means=ee.Array(histogram.get('bucketMeans'));
   var size=means.length().get([0]);
   var total=counts.reduce(ee.Reducer.sum(), [0]).get([0]);
   var sum=means.multiply(counts).reduce(ee.Reducer.sum(), [0])
       .get([0]);
   var mean=sum.divide(total);
   var indices=ee.List.sequence(1, size);
   var bss=indices.map(function(i){
       var aCounts=counts.slice(0, 0, i);
       var aCount=aCounts.reduce(ee.Reducer.sum(), [0])
           .get([0]);
       var aMeans=means.slice(0, 0, i);
       var aMean=aMeans.multiply(aCounts)
           .reduce(ee.Reducer.sum(), [0]).get([0])
           .divide(aCount);
       var bCount=total.subtract(aCount);
       var bMean=sum.subtract(aCount.multiply(aMean))
           .divide(bCount);
       return aCount.multiply(aMean.subtract(mean).pow(2))
           .add(
               bCount.multiply(bMean.subtract(mean).pow(2)));
   });
   return means.sort(bss).get([-1]);
}
  } catch (e) {
    print('Error processing point:', coords, ' - ', e.message);
  }
});
