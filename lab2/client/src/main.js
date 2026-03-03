import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';  
import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';

const baseLayer = new TileLayer({
  source: new XYZ({
    url: 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attributions: '© OpenStreetMap contributors, © CartoDB'
  }),
  opacity: 1.0
});

// Слой зданий
const buildingsLayer = new ImageLayer({
  source: new ImageWMS({
    url: 'http://localhost:8080/geoserver/gis/wms',
    params: {
      'LAYERS': 'gis:buildings',
      'TILED': true,
      'TRANSPARENT': true
    },
    ratio: 1,
    serverType: 'geoserver'
  })
});

// Слой дорог
const roadsLayer = new ImageLayer({
  source: new ImageWMS({
    url: 'http://localhost:8080/geoserver/gis/wms',
    params: {
      'LAYERS': 'gis:roads',
      'TILED': true,
      'TRANSPARENT': true
    },
    ratio: 1,
    serverType: 'geoserver'
  })
});

// Cлой POI
const poisLayer = new ImageLayer({
  source: new ImageWMS({
    url: 'http://localhost:8080/geoserver/gis/wms',
    params: {
      'LAYERS': 'gis:pois',
      'TILED': true,
      'TRANSPARENT': true
    },
    ratio: 1,
    serverType: 'geoserver'
  })
});

// Карта
const map = new Map({
  target: 'map',
  layers: [
    baseLayer,
    buildingsLayer,
    roadsLayer,
    poisLayer
  ],
  view: new View({
    center: [5605847, 7045434],  
    zoom: 16
  })
});