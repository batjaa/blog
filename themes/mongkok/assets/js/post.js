window.postLoad = function() {

  var primaryColor = $.Color($('.nav-toggle').css('background-color'));

  {{ range last 1 .Site.Data.map.places }}
    const googleMapsSettings = {
      styled: true,
      latitude: {{.lat}},
      longitude: {{.lng}},
      zoom: 8,
      hue: primaryColor.toRgbaString(),
      gamma: 1.75,
      saturation: -80,
      lightness: -10,
      invertLightness: false,
      infoWindowContentString: '<h4>Info Window</h4>' + '<p>You can add content here</p>',
      mapId: 'GOOGLE_MAPS_API_TOKEN', // For production, create a Map ID in Google Cloud Console
    };

    // Activate Google Maps
    var mapCanvas = $('#map-canvas');
    if (mapCanvas.length > 0){
      mapCanvas.googleMaps(googleMapsSettings);
    }  
  {{ end }}
};