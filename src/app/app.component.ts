import { Component, Input } from '@angular/core';
import Maidenhead from 'maidenhead';
import Feature from 'ol/Feature';
import arc from 'arc';

declare var ol: any;
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'N1MMMapper';
  latitude: number = 49.3378;
  longitude: number = -124.4105;
  bound: {
    lowerLeft: {
      lat: 49.3378,
      lng: -124.4105
    },
    upperRight: {
      lat: 50,
      lng: -125
    }
  };
  map: any;
  feature: any;
  @Input() locatorValue: string;
  markerSource: any;
  arcSource: any;
  stationLocator : string;
  shackFeature: any;
  shackPosition: any;
  ngOnInit() {

    this.stationLocator = "CN89ac";

    this.markerSource = new ol.source.Vector();
    this.arcSource = new ol.source.Vector();
    var mousePositionControl = new ol.control.MousePosition({
      coordinateFormat: ol.coordinate.createStringXY(4),
      projection: 'EPSG:4326',
      // comment the following two lines to have the mouse position
      // be placed within the map.
      className: 'custom-mouse-position',
      target: document.getElementById('mouse-position'),
      undefinedHTML: '&nbsp;'
    });

    var markerStyle = new ol.style.Style({
      image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
        anchor: [0.5, 46],
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        opacity: 0.75,
        src: 'assets/icon.png'
      }))
    });

    var arcStyle = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: '#00FF00',
        width: 2
      })
    });

    this.map = new ol.Map({
      target: 'map',
      controls: ol.control.defaults({
        attributionOptions: {
          collapsible: false
        }
      }).extend([mousePositionControl]),
      layers: [
        new ol.layer.Tile({
          source: new ol.source.OSM()
        }),
        new ol.layer.Vector({
          source: this.markerSource,
          style: markerStyle,
        }),
        new ol.layer.Vector({
          source: this.arcSource,
          style: arcStyle,
        })
      ],
      view: new ol.View({
        center: ol.proj.fromLonLat([-124.4100, 49.3380]),
        zoom: 8
      })
    });

    this.shackPosition = this.mapLocator("CN89ae39la57");
    this.shackFeature = new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat([this.shackPosition[1], this.shackPosition[0]])),
      name: "VE7NA"
    });
    this.markerSource.addFeature(this.shackFeature);

    this.map.on('click', function (args) {
      console.log(args.coordinate);
      var lonlat = ol.proj.transform(args.coordinate, 'EPSG:3857', 'EPSG:4326');
      var maidenhead = new Maidenhead(lonlat[1], lonlat[0], 6);
      console.log(lonlat);
      
      var lon = lonlat[0];
      var lat = lonlat[1];

      alert(`lat: ${lat} long: ${lon} : Locator : ${maidenhead.locator}`);
    });
  }

  addMapLocator(locator, callsign) {
    var position = this.mapLocator(locator);
    var iconFeature = new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat([position[1], position[0]])),
      name: callsign
    });
    //this.markerSource.clear();
    //this.markerSource.addFeature(this.shackFeature);
    this.markerSource.addFeature(iconFeature);

    var generator = new arc.GreatCircle(
      {x: this.shackPosition[1], y: this.shackPosition[0]}, 
      {x: position[1], y: position[0]}, 
      {'name': 'VE7NA - ' + callsign});
    var arcLine = generator.Arc(100,{offset:50});
    var line = new ol.geom.LineString(arcLine.geometries[0].coords);
    console.log(line);
    line.transform('EPSG:4326', 'EPSG:3857');
    var feature = new ol.Feature({
      geometry: line,
      finished: false
    });
    this.arcSource.addFeature(feature);

    var ext=feature.getGeometry().getExtent();
    this.map.getView().fit(ext, this.map.getSize());
  }

  mapLocator(locator) {
    console.log("Locator :", locator);
    if ( Maidenhead.valid(locator) ) {

      // Now get the upper right
      var locatorUpper = locator;
      if ( "01234567890".indexOf(locator.substr(locator.length-1)) != -1 ) {
        locatorUpper = locatorUpper + "AA";
      } else {
        locatorUpper = locatorUpper + "00";
      }
      var position = Maidenhead.toLatLon(locatorUpper);
      console.log("Locator position : ", position);

      return position;
    }
  }


  setCenter() {
    var view = this.map.getView();
    view.setCenter(ol.proj.fromLonLat([this.longitude, this.latitude]));
    view.setZoom(15);
  }

  getLatLngFromLocator(locator) {
    locator = locator.trim().toUpperCase();
    // if ( locator.length < 6 ) {
    //   locator += "LL55LL55".substr(0, 6-locator.length);
    // } 
    console.log("Massaged locator: ", locator);

    if (locator.match("^[A-R]{2}[0-9]{2}$") !== null) {
      console.log("1");
      return this.calculateUpperRight({ lowerLeft:{  
        lng:(locator.charCodeAt(0) - 'A'.charCodeAt(0)) * 20 + (locator.charCodeAt(2) - '0'.charCodeAt(0) + 0.5) * 2 - 180,
        lat:(locator.charCodeAt(1) - 'A'.charCodeAt(0)) * 10 + (locator.charCodeAt(3) - '0'.charCodeAt(0) + 0.5) - 90
      }, upperRight:{}}, 2);
    } else if (locator.match("^[A-R]{2}[0-9]{2}[A-X]{2}$") !== null) {
      console.log("2");
      return this.calculateUpperRight({lowerLeft:{
			  lng:(locator.charCodeAt(0) - 'A'.charCodeAt(0)) * 20 + (locator.charCodeAt(2) - '0'.charCodeAt(0)) * 2 + (locator.charCodeAt(4) - 'A'.charCodeAt(0) + 0.5) / 12 - 180,
				lat:(locator.charCodeAt(1) - 'A'.charCodeAt(0)) * 10 + (locator.charCodeAt(3) - '0'.charCodeAt(0)) + (locator.charCodeAt(5) - 'A'.charCodeAt(0) + 0.5) / 24 - 90
			}, upperRight:{}}, 4);
    } else if (locator.match("^[A-R]{2}[0-9]{2}[A-X]{2}[0-9]{2}$") !== null) {
      console.log("3");
      return this.calculateUpperRight({lowerLeft:{
				lng:(locator.charCodeAt(0) - 'A'.charCodeAt(0)) * 20 + (locator.charCodeAt(2) - '0'.charCodeAt(0)) * 2 + (locator.charCodeAt(4) - 'A'.charCodeAt(0) + 0.0) / 12 + (locator.charCodeAt(6) - '0'.charCodeAt(0) + 0.5) / 120 - 180,
				lat:(locator.charCodeAt(1) - 'A'.charCodeAt(0)) * 10 + (locator.charCodeAt(3) - '0'.charCodeAt(0)) + (locator.charCodeAt(5) - 'A'.charCodeAt(0) + 0.0) / 24 + (locator.charCodeAt(7) - '0'.charCodeAt(0) + 0.5) / 240 - 90
      }, upperRight:{}}, 6);
		} else if (locator.match("^[A-R]{2}[0-9]{2}[A-X]{2}[0-9]{2}[A-X]{2}$") !== null) {
      console.log("4");
			return this.calculateUpperRight({lowerLeft:{
				  lng:(locator.charCodeAt(0) - 'A'.charCodeAt(0)) * 20 + (locator.charCodeAt(2) - '0'.charCodeAt(0)) * 2 + (locator.charCodeAt[4] - 'A'.charCodeAt(0) + 0.0) / 12 + (locator.charCodeAt(6) - '0'.charCodeAt(0) + 0.0) / 120 + (locator.charCodeAt(8) - 'A'.charCodeAt(0) + 0.5) / 120 / 24 - 180,
				  lat:(locator.charCodeAt(1) - 'A'.charCodeAt(0)) * 10 + (locator.charCodeAt(3) - '0'.charCodeAt(0)) + (locator.charCodeAt[5] - 'A'.charCodeAt(0) + 0.0) / 24 + (locator.charCodeAt(7) - '0'.charCodeAt(0) + 0.0) / 240 + (locator.charCodeAt(9) - 'A'.charCodeAt(0) + 0.5) / 240 / 24 - 90
      }, upperRight:{}}, 8);
		} else {
      console.log("No Match");
      return null;
		}
  }

  calculateUpperRight( result, precision) {
    console.log("Precision :", precision);
    if ( precision === 2 ) {
      result.upperRight.lat = result.lowerLeft.lat + 1;
      result.upperRight.lng = result.lowerLeft.lng + 2;
    } else if ( precision == 4 ) {
      result.upperRight.lat = result.lowerLeft.lat + 0.04166667;
      result.upperRight.lng = result.lowerLeft.lng + 0.08333333;
    } else if ( precision == 3 ) {
      result.upperRight.lat = result.lowerLeft.lat + 1;
      result.upperRight.lng = result.lowerLeft.lng + 1;
    } else {
      result.upperRight.lat = result.lowerLeft.lat + 1;
      result.upperRight.lng = result.lowerLeft.lng + 1;
    }
    return result;
  }

}
