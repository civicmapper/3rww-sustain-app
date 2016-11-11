var areaType = 'currentView';
var drawnLayer;
var backdrop, muniLayer;
var nPolygon;
var mPolygon;

//initialize map
var map = new L.Map('map', {
    center: [40.4016274,-79.9315583],
    zoom: 15
});

//L.esri.basemapLayer('Gray').addTo(map);
//L.esri.basemapLayer('GrayLabels').addTo(map);
L.esri.Vector.basemap('Gray').addTo(map);


var selectLayer = L.geoJson().addTo(map); //add empty geojson layer for selections

//leaflet draw stuff

var options = {
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
};

var drawControl = new L.Control.Draw(options);
map.addControl(drawControl);
$('.leaflet-draw-toolbar').hide();

var customPolygon;
map.on('draw:created', function (e) {
    console.log('draw:created');
    //hide the arrow
    $('.infoArrow').hide();

    var type = e.layerType,
        layer = e.layer;

    console.log(e.layer);
    drawnLayer = e.layer;

    var coords = e.layer._latlngs;
    console.log(JSON.stringify(coords));
    //customPolygon = makeSqlPolygon(coords);
    // Do whatever else you need to. (save to db, add to map etc)
    map.addLayer(layer);
    $('.download').removeAttr('disabled');
});

map.on('draw:drawstart', function (e) {
    console.log('start');
    if (drawnLayer) {
        map.removeLayer(drawnLayer);
    }
});

/* SWAP CODE BELOW FOR ESRI LEAFLET MAP STUFF
//add cartodb named map
var layerUrl = 'https://wprdc.cartodb.com/api/v2/viz/24843ea8-f778-11e5-a7c9-0e674067d321/viz.json';

cartodb.createLayer(map, layerUrl)
    .addTo(map)
    .on('done', function (layer) {
        backdrop = layer.getSubLayer(0);
        backdrop.setInteraction(false);
        //TODO: build array of selction layers based off JSON file
        muniLayer = layer.getSubLayer(1);
        watershedLayer = layer.getSubLayer(2);

        muniLayer.hide();  //hide municipality polygons
        watershedLayer.hide();
        muniLayer.on('featureClick', processMuni);
        watershedLayer.on('featureClick', processWatershed);
    });
*/

/*L.esri.dynamicMapLayer({
    url: 'http://geo.civicmapper.com:6080/arcgis/rest/services/sustain2013/MapServer'
}).addTo(map);*/

var defaultStyleOptions = {color: '#4396E4', weight: 3, opacity: 0.6, fillOpacity:0};
var highlitStyleOptions = {color: '#4396E4', weight: 6, opacity: 1, fillOpacity: 0.6, fillColor: '#4396E4' };

var watershedLayer = L.esri.featureLayer({
    url: 'https://services1.arcgis.com/vdNDkVykv9vEWFX4/arcgis/rest/services/Watersheds/FeatureServer/0',
    ignoreRenderer: true,
    style: function() {
        return defaultStyleOptions;
    }
});
watershedLayer.on('click', processWatershed);

var muniLayer = L.esri.featureLayer({
    url: 'https://services1.arcgis.com/vdNDkVykv9vEWFX4/arcgis/rest/services/AlleghenyCountyMunicipalBoundaries/FeatureServer/0',
    ignoreRenderer: true,
    style: function() {
        return defaultStyleOptions;
    }
});
muniLayer.on('click', processMuni);

//$('#splashModal').modal('show');

/* populate fields list
$.getJSON('data/fields.json', function (data) {

    //console.log(data.length);
    data.forEach(function (field) {
        var listItem = '<li id = "' + field.name + '" class="list-group-item">'
            + field.title
            + '<span class="glyphicon glyphicon-info-sign icon-right" aria-hidden="true"></span></li>'

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
*/

/*//listeners
$('#selectAll').click(function () {
    $(".fieldList li").click();
    listChecked();
});
*/

//radio buttons
$('input[type=radio][name=area]').change(function () {
    //reset all the things
    if (map.hasLayer(muniLayer)) {muniLayer.remove();}
    if (map.hasLayer(watershedLayer)) {watershedLayer.remove();}
    selectLayer.clearLayers();
    $('.leaflet-draw-toolbar').hide();
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
        $('.download').attr('disabled', 'disabled');
    }
    if (this.value == 'watershed') {
        areaType = 'watershed';
        watershedLayer.addTo(map);
        flush_selections();
        $('.download').attr('disabled', 'disabled');
    }
});

var flush_selections = function(){
    customPolygon = undefined;
    nPolygon = undefined;
    mPolygon = undefined;
};

//runs when any of the download buttons is clicked
$('.download').click(function () {

    var data = {};

    //get current view, download type, and checked fields
    var bbox = map.getBounds();
    data.intersects = customPolygon;
    data.type = $(this).attr('id');
    var checked = listChecked();
    console.log(checked);

    //generate comma-separated list of fields
    data.fields = '';
    for (var i = 0; i < checked.length; i++) {
        data.fields += checked[i] + ',';
    }
    console.log(data.fields);

    //only add leading comma if at least one field is selected
    if (data.fields.length > 0) {
        data.fields = ',' + data.fields.slice(0, -1);
    }


    if (areaType == 'currentView') {
        var bboxString = bbox._southWest.lng + ','
            + bbox._southWest.lat + ','
            + bbox._northEast.lng + ','
            + bbox._northEast.lat;

        data.intersects = 'ST_MakeEnvelope(' + bboxString + ',4326)';
    }

    if (areaType == 'polygon') {
        if(customPolygon == undefined){
            alert("Don't forget to draw your area on the map!");
            return;
        }
        data.intersects = customPolygon;
    }


    if (areaType == 'municipality') {
        if(mPolygon == undefined){
            alert("Don't forget to select your municipality from the map!");
            return;
        }
        data.intersects = mPolygon;
    }

    if (areaType == 'watershed') {
        if(nPolygon == undefined){
            alert("Don't forget to select your watershed from the map!");
            return;
        }
        data.intersects = nPolygon;
    }

    if (data.type == 'cartodb') {
        data.type = 'geojson';
        data.cartodb = true;
    }

    var queryTemplate = 'https://wprdc.cartodb.com/api/v2/sql?skipfields=cartodb_id,created_at,updated_at,name,description&format={{type}}&filename=parcel_data&q=SELECT the_geom{{fields}} FROM property_assessment_app a WHERE ST_INTERSECTS({{{intersects}}}, a.the_geom)';


    var buildquery = Handlebars.compile(queryTemplate);
    console.log(data);
    var url = buildquery(data);

    console.log("Downloading " + url);

    //http://oneclick.cartodb.com/?file={{YOUR FILE URL}}&provider={{PROVIDER NAME}}&logo={{YOUR LOGO URL}}
    if (data.cartodb) {
        //open in cartodb only works if you encodeURIcomponent() on the SQL,
        //then concatenate with the rest of the URL, then encodeURIcomponent() the whole thing

        //first, get the SQL
        var sql = url.split("q=");
        sql = encodeURIComponent(sql[1]);


        url = url.split("SELECT")[0];
        url += sql;

        url = encodeURIComponent(url);
        console.log(url);
        url = 'https://oneclick.cartodb.com/?file=' + url;
    }

    window.open(url, 'My Download');


});

/**
 ** functions
 **/


//when a polygon is clicked, get its id and change its style

var previousIds = [];

function processMuni(e) {
    console.log('selected data', e.latlng);
    for (var j = 0; j < previousIds.length; j++) {
        muniLayer.resetStyle(previousIds[j]);
    }
    muniLayer.query()
        .intersects(e.latlng)
        .ids(function(error, ids){
            console.log(ids);
            previousIds = ids;
            for (var i = 0; i < ids.length; i++) {
              muniLayer.setFeatureStyle(ids[i], highlitStyleOptions);
            }
        });
}

function processWatershed(e) {
    console.log('selected data', e.latlng);
    for (var j = 0; j < previousIds.length; j++) {
        watershedLayer.resetStyle(previousIds[j]);
    }
    watershedLayer.query()
        .intersects(e.latlng)
        .ids(function(error, ids){
            console.log(ids);
            previousIds = ids;
            for (var i = 0; i < ids.length; i++) {
              watershedLayer.setFeatureStyle(ids[i], highlitStyleOptions);
            }
        });
}


/**
 ** map and DOM initialization
 **/

/*
function initCheckboxes() {
    //sweet checkbox list from http://bootsnipp.com/snippets/featured/checked-list-group
    $('.list-group.checked-list-box .list-group-item').each(function () {

        // Settings
        var $widget = $(this),
            $checkbox = $('<input type="checkbox" class="hidden" />'),
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

        $widget.css('cursor', 'pointer')
        $widget.append($checkbox);

        // Event Handlers
        $widget.on('click', function () {
            $checkbox.prop('checked', !$checkbox.is(':checked'));
            $checkbox.triggerHandler('change');
            updateDisplay();
        });
        $checkbox.on('change', function () {
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
*/

/*
function listChecked() {
    var checkedItems = [];
    $(".fieldList li.active").each(function (idx, li) {
        checkedItems.push($(li).attr('id'));
        console.log(checkedItems);
    });
    return checkedItems;
}
*/


$(document).ready(function () {
    $('.js-about').click(function () {

        $('#modal').fadeIn();
    });

    $('#modal').click(function () {
        $(this).fadeOut();
    });

    $('.modal-inner').click(function (event) {
        event.stopPropagation();
    });

    $(document).on('keyup', function (evt) {
        if (evt.keyCode == 27) {
            if ($('#modal').css('display') == 'block') {
                $('#modal').fadeOut();
            }
        }
    });

    /*
    var scrollShadow = (function () {
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
            elem.on("scroll.shadow", function () {
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
            $(window).on("resize.shadow", function () {
                clearTimeout(timeout);
                timeout = setTimeout(function () {
                    calcPosition();
                    elem.trigger("scroll.shadow");
                }, 10);
            });
        }

        return {
            init: function (par) {
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
    */
});
