/*
# README: WaTSat Algorithm

## Description
The WaTSat (Water Area Tracking from Satellite Imagery) algorithm is a Google Earth Engine (GEE) script designed to automatically generate water
area time series for lakes and reservoirs using satellite imagery. This tool performs several tasks, including search area refinement,
lake boundary delineation, cloud removal, and post-processing, with optional smoothing and blunder detection.

## Features
- **Automatic Area Tracking:** Generates water area time series using MODIS satellite imagery.
- **Customizable Parameters:** Enables user-defined monitoring periods, buffer sizes, and thresholds for water and land masks.
- **Cloud Coverage Management:** Handles cloud-contaminated pixels using smoothing and filtering algorithms.
- **Post-Processing Options:** Includes blunder detection and smoothing algorithms (mean and median filters).
- **Multi-Lake Processing:** Capable of processing multiple lakes simultaneously.

---

## Inputs
1. **Lake Coordinates:**
   Provide the geographical coordinates of the lakes (latitude and longitude). Example:
   ```javascript
   var lakeCoordinates = [
     [43.236, 33.98],
     [42.349, 34.325],
     [45.01, 34.2]
   ];
   ```
   Alternatively, define a geometry in the GEE interface for multiple points:
   ```javascript
   var geometry = ee.Geometry.MultiPoint([
     [45.0055, 34.2011],
     [45.4532, 34.3078],
     [44.5935, 34.2283]
   ]);
   ```

2. **Monitoring Period:**
   Define the time range for analysis in years. Example:
   ```javascript
   var time_start = '2023';  
   var time_end = '2025';  
   ```

3. **Buffer Size:**
   Specify the buffer size (in kilometers) to adjust the lake search area. Example:
   ```javascript
   var buffer_size = 5;  
   ```

4. **Cloud Coverage Threshold:**
   Define the acceptable percentage of cloud coverage. Example:
   ```javascript
   var cloud_cover = 10;  
   ```
5. **Interpolation period for cloud coverage removal:**
   Define the temporal range for the interpolation. Example:
   ```javascript
   var cloud_smoothing_window = 25;  
   ```

6. **Post-Processing Options:**
   - Blunder detection: `'yes'` or `'no'`  
   - Moving average/median smoothing filters: `'yes'` or `'no'`  
   - Window size for smoothing: Example:
     ```javascript
     var Blunder_Detection = 'no';  
     var Moving_Average_Mean = 'no';  
     var Moving_Average_Median = 'no';  
     var windowSize = 3;  
     ```

---

## Outputs
1. **Water Area Time Series:**
   - Time series of lake water area (in square kilometers).  
   - Graphical representation of the time series, with optional blunder detection and smoothing filters applied.  


---

## Workflow Overview
1. **Lake Search Area Modification:**
   Buffers the area around the provided coordinates using a user-defined radius.  

2. **Data Acquisition:**
   - Fetches MODIS satellite imagery for the specified monitoring period.  
   - Imports HydroLakes dataset to refine lake boundaries.  

3. **Cloud Removal and Quality Control:**
   - Applies cloud filters using bitwise operations.  
   - Generates masks for persistent water and land areas using JRC Global Surface Water data.  

4. **Post-Processing:**
   - Detects outliers using a 3-sigma blunder detection algorithm.  
   - Applies optional smoothing (mean or median filters).  

5. **Visualization:**
   - Generates plots to display water area time series.  
   - Offers options for further analysis using cleaned data.  

---

## Example Use
1. **Set Parameters:**
   ```javascript
   var time_start = '2023';  
   var time_end = '2025';  
   var buffer_size = 5;  
   var cloud_cover = 10;  
   var Blunder_Detection = 'yes';  
   var Moving_Average_Median = 'yes';  
   var windowSize = 3;  
   ```

2. **Run the Script:**
   Paste the code into the GEE editor, modify the parameters, and execute the script.  

3. **View Outputs:**
   - The script will print water area time series and display visualizations in the GEE interface.  

---

## Acknowledgments
This tool was developed as part of the study:  
*"An Automatic Google Earth Engine Tool for Generating Lake Water Area Time Series from Satellite Imagery."* 
Published in IEEE Geoscience and Remote Sensing Letters
Authors: Omid Elmi (University of Stuttgart) and Amirhossein Ahrari (University of Oulu).  

--- 

## References
- MODIS/061/MOD09Q1 Dataset  
- JRC Global Surface Water Occurrence Dataset  
- HydroLakes Dataset  

For questions or issues, contact:  
- Omid Elmi (omid.elmi@gis.uni-stuttgart.de)  
- Amirhossein Ahrari (Amirhossein.Ahrari@oulu.fi)  
*/