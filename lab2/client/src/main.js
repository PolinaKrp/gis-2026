import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import {applyStyle} from 'ol-mapbox-style';

const baseLayer = new TileLayer({
  source: new XYZ({
    url: 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attributions: '© OpenStreetMap contributors, © CartoDB'
  }),
  opacity: 1.0
});

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

// ЛР3: Векторный слой с ol-mapbox-style

// Векторный источник
const overtureSource = new VectorSource({
  url: './overture.geojson',
  format: new GeoJSON()
});

// Векторный слой
const overtureLayer = new VectorLayer({
  source: overtureSource,
  zIndex: 20
});

const mapboxStyle = {
  "version": 8,
  "sources": {
    "overture": {
      "type": "geojson",
      "data": "./overture.geojson"
    }
  },
  "layers": [
    {
      "id": "overture-fill",
      "type": "fill",
      "source": "overture",
      "paint": {
        "fill-color": [
          "match",
          ["get", "source_type"],
          "my", "rgba(76, 175, 80, 0.7)",      
          "osm", "rgba(33, 150, 243, 0.7)",    
          "ml", "rgba(255, 152, 0, 0.7)",      
          "rgba(158, 158, 158, 0.4)"           
        ],
        "fill-outline-color": "#333333"
      }
    }
  ]
};

// Применяем Mapbox Style к слою
applyStyle(overtureLayer, mapboxStyle);

map.addLayer(overtureLayer);

// Попап при клике
map.on('singleclick', function(evt) {
  const feature = map.forEachFeatureAtPixel(evt.pixel, function(f) {
    return f.get('source_type') ? f : null;
  });
  
  if (feature) {
    const p = feature.getProperties();
    const content = `
      Здание
      Источник: ${p.source_type}
      ID: ${p.id}
      ${p.name ? `Название: ${p.name}` : ''}
      ${p.height ? `Высота: ${p.height} м` : ''}
    `;
    alert(content.trim());
  }
});