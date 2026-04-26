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
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';

// 1. БАЗОВЫЙ СЛОЙ
const baseLayer = new TileLayer({
  source: new XYZ({
    url: 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attributions: '© OpenStreetMap contributors, © CartoDB'
  }),
  zIndex: 0
});

// 2. СЛОИ ИЗ ЛР2
const buildingsLayer = new ImageLayer({
  source: new ImageWMS({
    url: 'http://localhost:8080/geoserver/gis/wms',
    params: { 'LAYERS': 'gis:buildings', 'TILED': true, 'TRANSPARENT': true },
    ratio: 1,
    serverType: 'geoserver'
  }),
  opacity: 0.6,  
  zIndex: 1
});

const roadsLayer = new ImageLayer({
  source: new ImageWMS({
    url: 'http://localhost:8080/geoserver/gis/wms',
    params: { 'LAYERS': 'gis:roads', 'TILED': true, 'TRANSPARENT': true },
    ratio: 1,
    serverType: 'geoserver'
  }),
  opacity: 0.7,
  zIndex: 2
});

const poisLayer = new ImageLayer({
  source: new ImageWMS({
    url: 'http://localhost:8080/geoserver/gis/wms',
    params: { 'LAYERS': 'gis:pois', 'TILED': true, 'TRANSPARENT': true },
    ratio: 1,
    serverType: 'geoserver'
  }),
  opacity: 1.0,
  zIndex: 3
});

// 3. КАРТА
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

// 4. СЛОЙ OVERTURE ЛР3
const overtureSource = new VectorSource({
  url: './overture.geojson',
  format: new GeoJSON()
});

function getOvertureStyle(feature) {
  const type = feature.get('source_type');
  let color = 'rgba(158,158,158,0.4)';
  
  if (type === 'my') color = 'rgba(76,175,80,0.85)';     
  else if (type === 'osm') color = 'rgba(33,150,243,0.85)'; 
  else if (type === 'ml') color = 'rgba(255,152,0,0.85)';   
  
  return new Style({
    fill: new Fill({ color }),
    stroke: new Stroke({ color: '#222', width: 1.5 })  
  });
}

const overtureLayer = new VectorLayer({
  source: overtureSource,
  style: getOvertureStyle,
  zIndex: 100  
});

map.addLayer(overtureLayer);

// 5. КЛИК
map.on('singleclick', function(evt) {
  const feature = map.forEachFeatureAtPixel(evt.pixel, f => 
    f.get('source_type') ? f : null
  );
  
  if (feature) {
    const p = feature.getProperties();
    alert(`${p.source_type?.toUpperCase()}\nID: ${p.id}\n${p.name || ''}`.trim());
  }
});
