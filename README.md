# WaTSat: An Automatic Google Earth Engine Tool for Generating Lake Water Area Time Series from Satellite Imagery

WaTSat (Water Area Tracking from Satellite Imagery) is a Google Earth Engine (GEE)-based tool that automates the generation of long-term water area time series for lakes and reservoirs worldwide using MODIS satellite imagery. This tool is designed for ease of use, requiring minimal user input while handling complex tasks such as cloud masking, blunder detection, and smoothing.

## Features
- **Automated Processing**: Automates tasks like lake boundary delineation, cloud masking, and time series generation.
- **Flexible Input**: Accepts multiple lake coordinates and monitoring periods for batch processing.
- **Blunder Detection and Smoothing**: Includes optional 3-sigma blunder detection and moving average/median filters.
- **Customizable Parameters**: Allows users to define thresholds for water/land masks, cloud coverage limits, and smoothing window sizes.

## How It Works
1. **Input Parameters**:
   - Lake coordinates
   - Monitoring time period (e.g., start and end years)
   - Buffer size for lake boundaries
   - Thresholds for constant water and land masks
   - Cloud coverage acceptance rate
   - Temporal range for cloud contamination removal  interpolation 
2. **Process Flow**:
   - Searches for the selected lakes in the HydroLakes dataset.
   - Generates constant water and land masks using the Global Surface Water dataset.
   - Modifies the lake shoreline search area using the defined masks.
   - Generates temporal stack of the modified search area from MODIS MOD09Q1 imagery.
   - Applies the Otsu dynamic thresholding algorithm to the image stack and finds the  water/land threshold.
   - Generates water area time series
   - Applies blunder detection and smoothing filters (if enabled).
3. **Output**:
   - Time series of lake water areas.
   - Optional smoothed or cleaned data for better visualization.

## Usage
1. **Set Parameters**:
   - Replace `lakeCoordinates` with your lake locations in `[Longitude, Latitude]` format.
   - Specify `time_start` and `time_end` for the monitoring period.
   - Adjust buffer size, thresholds, and other settings as needed.
2. **Run the Script**:
   - Open Google Earth Engine Code Editor.
   - Paste the script into the editor and execute it.
3. **View Results**:
   - The time series data will be printed in the console and visualized on the map.

## Example
```javascript
// Define lake coordinates
var lakeCoordinates = [
  [43.236, 33.98], 
  [42.349, 34.325],
  [45.01, 34.2]
];

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
// 3 Sigma blunder detection algorithm
var Blunder_Detection='no' // 'yes' or 'no'
// Moving average algorithm
var Moving_Average_Mean = 'no' // 'yes' or 'no'
// Moving median algorithm
var Moving_Average_Median = 'no' // 'yes' or 'no'
// Defining the window size for the moving average or moving median smoothing filter
var windowSize=3 // the size of the moving average window e.g. 3, 5
