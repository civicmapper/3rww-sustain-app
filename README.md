# 3RWW EPA SUSTAIN App

This mapping tool is for the exploration and download of 3 Rivers Wet Weather's (3RWW) 2013 results from the EPA System Urban Stormwater Treatment and Analysis Integration (SUSTAIN) model for Allegheny County. The map is intended to help municipalities acquire the data and create the maps required for compliance with certain [wet weather regulations](http://3riverswetweather.org/about-wet-weather-issue/wet-weather-regulations). 

The SUSTAIN modeling work was conducted by Michael Baker Corp. in 2013. More info on SUSTAIN can be found on the [US EPA website]( https://www.epa.gov/water-research/system-urban-stormwater-treatment-and-analysis-integration-sustain). Contact [bdutton@3rww.org](mailto:bdutton@3rww.org) for more information about the model.

---

This software is based on the [WPRDC's Property Information Extractor](https://github.com/WPRDC/property-information-extractor), which was based on Chris Whong's [plutoplus](https://github.com/chriswhong/plutoplus). In adapting those tools for this project, we had to make a few big changes under the hood. Since 3RWW is using an Esri mapping stack, this version swaps out the [CARTO JS javascript library](https://carto.com/docs/carto-engine/carto-js/) for the [Esri-Leaflet javascript library](https://esri.github.io/esri-leaflet). CartoJS is based on Leaflet, making that transition somewhat straightforward.

This is still a work-in-progress. Download/extraction functionality still needs to be reimplemented in a server-side geoprocessing script using either a FOSS4G library or an ArcGIS Server Geoprocessing service.