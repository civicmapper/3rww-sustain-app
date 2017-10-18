/** ----------------------------------------------------------------------------
 ** SOME GLOBAL VARIABLES
 **/

// variables for managing clipping layers
var areaType = 'currentView';
var customPolygon;
var drawnLayer;
// lookup for generating labels from data
var gi = {
    'BR': 'Bioretention',
    'CW': 'Constructed Wetland',
    'GS': 'Grassed Swales',
    'IB': 'Infiltration Basin',
    'PP': 'Porous Pavement',
    'VF': 'Vegetated Filterstrip'
};
var sustainZoom = 14;

/** ----------------------------------------------------------------------------
 ** SPLASH SCREEN
 **/

//$('#modal').show();

/** ----------------------------------------------------------------------------
 ** LEAFLET MAP INITIALIZATION
 **/

/** INITIALIZE MAP
 **/
var map = new L.Map('map', {
    //center: [40.4016274,-79.9315583],
    center: [40.4448373, -80.0088122],
    zoom: 10
});

/** ADD BASE MAP
 **/
//L.esri.basemapLayer('Gray').addTo(map);
//L.esri.basemapLayer('GrayLabels').addTo(map);
L.esri.Vector.basemap('Gray').addTo(map);

/** ADD REFERENCE LAYER(S)
 **/

var serviceArea = L.esri.featureLayer({
    url: 'https://services6.arcgis.com/dMKWX9NPCcfmaZl3/arcgis/rest/services/alcosan_basemap/FeatureServer/0',
    ignoreRenderer: true,
    style: function() {
        return {
            color: '#333333',
            weight: 8,
            opacity: 0.25,
            fillOpacity: 0.1
        };
    }
}).addTo(map);

/** ----------------------------------------------------------------------------
 ** LEAFLET DRAWING TOOLS
 **/

var drawControl = new L.Control.Draw({
    position: 'topright',
    draw: {
        polyline: false,
        polygon: {
            allowIntersection: false, // Restricts shapes to simple polygons
            drawError: {
                color: '#CC7450', // Color the shape will turn when intersects
                message: '<strong>Sorry!<strong> you can\'t draw that!' // Message that will show when intersect
            },
            shapeOptions: {
                color: '#4396E4'
            }
        },
        circle: false, // Turns off this drawing tool
        rectangle: {
            shapeOptions: {
                clickable: false
            }
        },
        marker: false
    }
});
map.addControl(drawControl);
$('.leaflet-draw-toolbar').hide();

map.on('draw:created', function(e) {
    console.log('draw:created');
    //hide the arrow
    $('.infoArrow').hide();

    var type = e.layerType,
        layer = e.layer;

    console.log(e.layer);
    drawnLayer = e.layer;

    var coords = e.layer._latlngs;
    console.log(JSON.stringify(coords));
    customPolygon = e.layer.feature;
    // Do whatever else you need to. (save to db, add to map etc)
    map.addLayer(layer);
    $('.download').removeAttr('disabled');
});

map.on('draw:drawstart', function(e) {
    console.log('start');
    if (drawnLayer) {
        map.removeLayer(drawnLayer);
    }
});

/** ----------------------------------------------------------------------------
 ** SUSTAIN LAYERS AND QUERY FUNCTIONS
 **/

/** SUSTAIN Map Service (currently disabled)
 ** this option provides both rendering and querying capability, but cannot be
 ** hosted on ArcGIS Online. Since we need to clip using an ArcGIS Server GP
 ** service anyway, we'll leave the querying and extraction functionality there.
 **

var sustainLayer = L.esri.dynamicMapLayer({
    url: 'http://geo.civicmapper.com:6080/arcgis/rest/services/sustain2013/MapServer'
}).addTo(map);
*/

/** SUSTAIN Tile Service
 ** This option provides rendering capability only, from a pre-rendered tile
 ** cache we've hosted openly on ArcGIS Online. 
 **/
var sustainLayer = L.esri.tiledMapLayer({
    url: 'https://tiles.arcgis.com/tiles/dMKWX9NPCcfmaZl3/arcgis/rest/services/sustain/MapServer',
}).addTo(map);

// pop-up object for displaying info about the SUSTAIN layer
var sustainPopup = L.popup();

// pop-up content for SUSTAIN Layer
function makePopUp(results) {
    var content = "<ul>";
    results.forEach(function(e) {
        content += '<li>' + e + '</li>';
    });
    content += '</ul>';
    return content;
}

/** QUERY THE SUSTAIN LAYER ON CLICK
 ** this function queries the SUSTAIN Map Service (ArcGIS Server) to provide
 ** information for a map pop-up window. Only returns results above a certain
 ** zoom level.
 **/
map.on('click', function(e) {
    if (map.getZoom() > sustainZoom) {
        var results = [];
        var queriesRemaining = 6;
        for (var i = 0; i < 6; i++) {
            L.esri.query({
                //url: "http://geo.civicmapper.com:6080/arcgis/rest/services/sustain2013/MapServer"
                url: "https://geo.civicmapper.com:6443/arcgis/rest/services/sustain2013/MapServer"
            }).intersects(e.latlng).layer(i).run(function(error, featureCollection) {
                // the query will always return a + response; check if there are actually features
                if (featureCollection.features.length > 0) {
                    // if there are, get the fields they have 0 because of the way the data is structured,
                    // type is reflected in the field name (row value is a boolean)
                    var r = featureCollection.features[0];
                    var fields = Object.keys(r.properties);
                    // compare fields against a lookup to determine which GI we've actually returned.
                    Object.keys(gi).forEach(function(e) {
                        if ($.inArray(e, fields) > -1) {
                            //console.log(gi[e]);
                            results.push(gi[e]);
                        }
                    });
                }
                --queriesRemaining;
                if (queriesRemaining <= 0) {
                    //console.log(results);
                    // make the PopUp; default content if nothing returned by query
                    var content;
                    if (map.getZoom() > sustainZoom) {
                        if (results.length > 0) {
                            content = '<h4>This point is suitable for:</h4><hr>' + makePopUp(results);
                        } else {
                            content = "No SUSTAIN results for this location";
                        }
                    } else {
                        content = "Zoom in further to see SUSTAIN results for this location";
                    }
    
    
                    // set PopUp location and content, and open it on the map
                    sustainPopup
                        .setLatLng(e.latlng)
                        .setContent(content)
                        .openOn(map);
                }
            });
        }
    }
});


/** ----------------------------------------------------------------------------
 ** CLIPPING LAYERS (WATERSHEDS AND MUNIS)
 **/

/** An empty geojson layer for selections
 */
var selectLayer = L.geoJson().addTo(map); 

/** Style Options for Selected LayersLayers
 */
var defaultStyleOptions = {
    color: '#4396E4',
    weight: 3,
    opacity: 0.6,
    fillOpacity: 0
};
var highlitStyleOptions = {
    color: '#4396E4',
    weight: 6,
    opacity: 1,
    fillOpacity: 0.6,
    fillColor: '#4396E4'
};

/** Watershed Layer (Feature Service)
 **/
var watershedLayerSelected;
var watershedLayer = L.esri.featureLayer({
    url: 'https://services1.arcgis.com/vdNDkVykv9vEWFX4/arcgis/rest/services/Watersheds/FeatureServer/0',
    ignoreRenderer: true,
    style: function() {
        return defaultStyleOptions;
    }
}).on('click', function(e) {
    // on click, highlight the selected polygon
    //querySustainLayer(e);
    if (watershedLayerSelected) {
        e.target.resetStyle(watershedLayerSelected);
        selectionInfo.update();
    }
    watershedLayerSelected = e.layer;
    watershedLayerSelected.setStyle(highlitStyleOptions);
    selectionInfo.update('Watershed', watershedLayerSelected.feature.properties.DESCR);
    console.log(watershedLayerSelected);
    // assign geojson object from layer to customPolygon var
});

/** Municipal Layer (Feature Service)
 **/
var muniLayerSelected;
var muniLayer = L.esri.featureLayer({
    //url: 'https://services1.arcgis.com/vdNDkVykv9vEWFX4/arcgis/rest/services/AlleghenyCountyMunicipalBoundaries/FeatureServer/0',
    url: 'https://services6.arcgis.com/dMKWX9NPCcfmaZl3/ArcGIS/rest/services/alcosan_munis/FeatureServer/0',
    ignoreRenderer: true,
    style: function() {
        return defaultStyleOptions;
    }
}).on('click', function(e) {
    // on click, highlight the selected polygon
    //querySustainLayer(e);
    if (muniLayerSelected) {
        e.target.resetStyle(muniLayerSelected);
        selectionInfo.update();
    }
    muniLayerSelected = e.layer;
    muniLayerSelected.setStyle(highlitStyleOptions);
    selectionInfo.update('Municipality', muniLayerSelected.feature.properties.MUNI_NAME);
    
});

/** zoomRequest
 ** tells the viewer to zoom in to see the results, disappears when the layer is
 ** available
 **/

var zoomRequest = L.control({
    position: 'bottomleft'
});

zoomRequest.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'zoomRequest');
    this._div.innerHTML = '<h4>Zoom in to see the SUSTAIN results</h4>';
    this.update();
    return this._div;
};

// method that we will use to update the control based on feature properties passed
zoomRequest.update = function(zoom) {
    if (zoom <= sustainZoom) {
        $(".zoomRequest").show();
    } else {
        $(".zoomRequest").hide();
    }
};

zoomRequest.addTo(map);


/** Info Control (for Watersheds or Munis)
 ** takes a the place of a pop-up for the muni and watershed layers
 **/

var selectionInfo = L.control({
    position: 'topright'
});

selectionInfo.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'selectionInfo');
    this.update();
    return this._div;
};

// method that we will use to update the control based on feature properties passed
selectionInfo.update = function(layerName, props) {
    this._div.innerHTML = (layerName ? '<h4>' + layerName + '</h4>' : 'Select an Area') + (props ? '<strong>' + props + '</strong>' : '');
};

selectionInfo.addTo(map);
$('.selectionInfo').hide();

/** ----------------------------------------------------------------------------
 ** DATA EXTRACTION CHECKBOXES (UI step 2)
 **/

/** checkbox list generator
 ** from http://bootsnipp.com/snippets/featured/checked-list-group
 **/
function initCheckboxes() {
    $('.list-group.checked-list-box .list-group-item').each(function() {

        // Settings
        var $widget = $(this),
            $checkbox = $('<input hidden type="checkbox" class="hidden" />'),
            color = ($widget.data('color') ? $widget.data('color') : "primary"),
            style = ($widget.data('style') == "button" ? "btn-" : "list-group-item-"),
            settings = {
                on: {
                    icon: 'glyphicon glyphicon-check'
                },
                off: {
                    icon: 'glyphicon glyphicon-unchecked'
                }
            };

        $widget.css('cursor', 'pointer');
        $widget.append($checkbox);

        // Event Handlers
        $widget.on('click', function() {
            $checkbox.prop('checked', !$checkbox.is(':checked'));
            $checkbox.triggerHandler('change');
            updateDisplay();
        });
        $checkbox.on('change', function() {
            updateDisplay();
        });


        // Actions

        function updateDisplay() {
            var isChecked = $checkbox.is(':checked');

            // Set the button's state
            $widget.data('state', (isChecked) ? "on" : "off");

            // Set the button's icon
            $widget.find('.state-icon')
                .removeClass()
                .addClass('state-icon ' + settings[$widget.data('state')].icon);

            // Update the button's color
            if (isChecked) {
                $widget.addClass(style + color + ' active');
            } else {
                $widget.removeClass(style + color + ' active');
            }
        }

        // Initialization

        function init() {

            if ($widget.data('checked') == true) {
                $checkbox.prop('checked', !$checkbox.is(':checked'));
            }

            updateDisplay();

            // Inject the icon if applicable
            if ($widget.find('.state-icon').length == 0) {
                $widget.prepend('<span class="state-icon ' + settings[$widget.data('state')].icon + '"></span>');
            }
        }

        init();
    });
}

function listChecked() {
    var checkedItems = [];
    $(".fieldList li.active").each(function(idx, li) {
        checkedItems.push($(li).attr('id'));
    });
    return checkedItems;
}

/** populate fields list
 **/
$.getJSON('data/fields.json', function(data) {

    //console.log(data.length);
    data.forEach(function(field) {
        var listItem = '<li id = "' + field.name + '" class="list-group-item">' + field.title + '<span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span></li>';
        //var listItem = '<li id = "' + field.name + '" class="list-group-item">' + field.title + '<span class="glyphicon glyphicon-info-sign icon-right" aria-hidden="true"></span></li>';
        $('.fieldList').append(listItem);
        $('#' + field.name).data("description", field.description);
    });

    //listener for hovers
    $('.icon-right').hover(showDescription, hideDescription);

    function showDescription() {
        var o = $(this).offset();

        var data = $(this).parent().data('description');

        $('#infoWindow')
            .html(data)
            .css('top', o.top - 10)
            .css('left', o.left + 30)
            .fadeIn(150);
    }

    function hideDescription() {
        $('#infoWindow')
            .fadeOut(150);
    }

    //custom functionality for checkboxes
    initCheckboxes();
});

//listeners
$('#selectAll').click(function() {
    $(".fieldList li").click();
    listChecked();
});

/** ----------------------------------------------------------------------------
 ** DATA EXTRACTION AREA SELECTION (UI step 1)
 **/

//radio buttons
$('input[type=radio][name=area]').change(function() {
    //reset all the things
    if (map.hasLayer(muniLayer)) {
        muniLayer.remove();
    }
    if (map.hasLayer(watershedLayer)) {
        watershedLayer.remove();
    }
    selectLayer.clearLayers();
    $('.leaflet-draw-toolbar').hide();
    $('.selectionInfo').hide();
    if (drawnLayer) {
        map.removeLayer(drawnLayer);
    }

    //turn on certain things
    if (this.value == 'polygon') {
        areaType = 'polygon';
        flush_selections();
        $('.leaflet-draw-toolbar').show();
        $('.download').attr('disabled', 'disabled');
    }
    if (this.value == 'currentView') {
        areaType = 'currentView';
        flush_selections();
    }
    if (this.value == 'municipality') {
        areaType = 'municipality';
        muniLayer.addTo(map);
        flush_selections();
        $('.selectionInfo').show();
        $('.download').attr('disabled', 'disabled');
    }
    if (this.value == 'watershed') {
        areaType = 'watershed';
        watershedLayer.addTo(map);
        flush_selections();
        $('.selectionInfo').show();
        $('.download').attr('disabled', 'disabled');
    }
    console.log(this.value + " selected for clipping area");
});

var flush_selections = function() {
    customPolygon = undefined;
    muniLayerSelected = undefined;
    watershedLayerSelected = undefined;
};

/** ----------------------------------------------------------------------------
 ** DATA EXTRACTION DOWNLOAD (UI step 3)
 **/

/** GP: run extraction service when any one of the download buttons is clicked
 */
$('.download').click(function() {
    
    //alert('Data extraction functionality is not yet enabled.');
    console.log("--------------------");
    console.log("Extraction initiated");
    
    // set up the geoprocessing service and task
    var extractionService = L.esri.GP.service({
        url: "https://geodata.civicmapper.com/arcgis/rest/services/sustain/sustain_extract_beta/GPServer/Clip%20and%20Convert",
        useCors: true
    });
    var gpTask = extractionService.createTask();
    
    // Set some templates for the data expected by GP Service
    var feature;
    var Output_Type = {"Output_GeoJSON":false, "Output_TopoJSON":false, "Output_DXF":false, "Output_SHP":false};
    var Input_Selection = {"BR":false, "CW":false, "GS":false, "IB":false, "PP":false, "VF":false};
    var Clipping_Features = {
        "displayFieldName": "",
        "geometryType": "esriGeometryPolygon",
        "spatialReference": {
            "wkid": 4326,
            "latestWkid": 4326
        },
        "fields": [{
                "name": "FID",
                "type": "esriFieldTypeOID",
                "alias": "FID"
            }, {
                "name": "id",
                "type": "esriFieldTypeInteger",
                "alias": "id"
            }, {
                "name": "Shape_Length",
                "type": "esriFieldTypeDouble",
                "alias": "Shape_Length"
            }, {
                "name": "Shape_Area",
                "type": "esriFieldTypeDouble",
                "alias": "Shape_Area"
            }
        ],
        "features": [],
        "exceededTransferLimit": false
    };
    
    // 1. determine which download format button was pressed, pass to GP param
    downloadSelected = $(this).attr('id');
    Output_Type[downloadSelected] = true;
    console.log("Output_Type: " + JSON.stringify(Output_Type));
    
    // 2. determine which features the user selected for extraction
    var layersToExtract = listChecked();
    layersToExtract.forEach(function(e) {
        Input_Selection[e] = true;
    });
    console.log("Input_Selection: " + JSON.stringify(Input_Selection));
    
    // 3. determine which clipping geometry to capture (ref the radio buttons)
    
    // use the map window's current visible extents for clipping
    if (areaType == 'currentView') {
        var bbox = map.getBounds();
        // turn map bounds to a Leaflet polygon object, since ESRI GP tool
        // expects a polygon, not an envelope geometry type
        var bboxPolygon = L.polygon([
            [bbox.getNorthWest().lng, bbox.getNorthWest().lat],
            [bbox.getNorthEast().lng, bbox.getNorthEast().lat],
            [bbox.getSouthEast().lng, bbox.getSouthEast().lat],
            [bbox.getSouthWest().lng, bbox.getSouthWest().lat]
        ]);
        // convert Leaflet polygon to GeoJSON using the Leaflet polygon class
        // method; then from GeoJSON to ESRI JSON using Terraformer
        feature = Terraformer.ArcGIS.convert(bboxPolygon.toGeoJSON());
        //push the ESRI JSON feature to the features template
        Clipping_Features.features.push(feature);
    }
    
    // use the user-drawn polygon for clipping
    if (areaType == 'polygon') {
        if(customPolygon === undefined){
            alert("Don't forget to draw your area on the map!");
            return;
        }
        //convert the drawn polygon (geojson) to ESRI JSON w/ Terraformer
        feature = Terraformer.ArcGIS.convert(customPolygon);
        //push the ESRI JSON feature to the features template
        Clipping_Features.features.push(feature);
    }

    // use the selected municipality 
    if (areaType == 'municipality') {
        if(muniLayerSelected === undefined){
            alert("Don't forget to select your municipality from the map!");
            return;
        }
        //convert the selection (geojson) to ESRI JSON w/ Terraformer
        feature = Terraformer.ArcGIS.convert(muniLayerSelected.feature);
        //push the ESRI JSON feature to the features template
        Clipping_Features.features.push(feature);
    }

    if (areaType == 'watershed') {
        if(watershedLayerSelected === undefined){
            alert("Don't forget to select your watershed from the map!");
            return;
        }
        //convert the selection (geojson) to ESRI JSON w/ Terraformer
        feature = Terraformer.ArcGIS.convert(watershedLayerSelected.feature);
        //push the ESRI JSON feature to the features template
        Clipping_Features.features.push(feature);
    }
    
    console.log("Clipping_Features: " + JSON.stringify(Clipping_Features));
    
    /** Run GP Task (only once it has been initialized)
     **
     **/
    gpTask.on('initialized', function(){
        gpTask.setParam("Input_Selection", JSON.stringify(Input_Selection));
        gpTask.setParam("Clipping_Features", JSON.stringify(Clipping_Features));
        gpTask.setParam("Output_Type", JSON.stringify(Output_Type));
        gpTask.setOutputParam("Result");
        console.log("Extraction initialized. Submitting Request...");
        $('#gpmessages').show();
        gpTask.run(function(error, response, raw){
            $('#gpmessages').hide();
            if (error) {
                $('#gperror').show();
                console.log("There was an error processing your request. Please try again.");
                console.log(error);
            } else {
                $('#gpsuccess').show();
                console.log("Extraction complete!");
                window.location.assign(response.Result.url);
            }
        });
    });
});

/** ------------------------------------------------------------------------
 ** DOM READY
 **/

function hideNotices(event) {
    event.preventDefault();
    $( this ).hide();
}

$("#gperror").click(hideNotices);
$("#gpsuccess").click(hideNotices);

$(document).ready(function() {
    $('.js-about').click(function() {

        $('#modal').fadeIn();
    });

    $('#modal').click(function() {
        $(this).fadeOut();
    });

    $('.modal-inner').click(function(event) {
        event.stopPropagation();
    });

    $(document).on('keyup', function(evt) {
        if (evt.keyCode == 27) {
            if ($('#modal').css('display') == 'block') {
                $('#modal').fadeOut();
            }
        }
    });


    var scrollShadow = (function() {
        var elem, width, height, offset,
            shadowTop, shadowBottom,
            timeout;

        function initShadows() {
            shadowTop = $("<div>")
                .addClass("shadow-top")
                .insertAfter(elem);
            shadowBottom = $("<div>")
                .addClass("shadow-bottom")
                .insertAfter(elem)
                .css('display', 'block');
        }

        function calcPosition() {
            width = elem.outerWidth();
            height = elem.outerHeight();
            offset = elem.position();

            // update
            shadowTop.css({
                width: width + "px",
                top: offset.top + "px",
                left: offset.left + "px"
            });
            shadowBottom.css({
                width: width + "px",
                top: (offset.top + height - 40) + "px",
                left: offset.left + "px"
            });
        }

        function addScrollListener() {
            elem.off("scroll.shadow");
            elem.on("scroll.shadow", function() {
                if (elem.scrollTop() > 0) {
                    shadowTop.fadeIn(125);
                } else {
                    shadowTop.fadeOut(125);
                }
                if (elem.scrollTop() + height >= elem[0].scrollHeight && elem.scrollTop() !== 0) {
                    shadowBottom.fadeOut(125);
                } else {
                    shadowBottom.fadeIn(125);
                }
            });
        }

        function addResizeListener() {
            $(window).on("resize.shadow", function() {
                clearTimeout(timeout);
                timeout = setTimeout(function() {
                    calcPosition();
                    elem.trigger("scroll.shadow");
                }, 10);
            });
        }

        return {
            init: function(par) {
                elem = $(par);
                initShadows();
                calcPosition();
                addScrollListener();
                addResizeListener();
                elem.trigger("scroll.shadow");
            },
            update: calcPosition
        };

    }());
    // start
    scrollShadow.init(".well-inner");
});

map.on('zoomend', function(e) {
    console.log(map.getZoom());
    zoomRequest.update(map.getZoom());
});
