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
import { applyStyle } from 'ol-mapbox-style';

// Базовый слой
const baseLayer = new TileLayer({
  source: new XYZ({
    url: 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attributions: '© OpenStreetMap contributors, © CartoDB'
  })
});

// Слои WMS
const buildingsLayer = new ImageLayer({
  source: new ImageWMS({
    url: 'http://localhost:8080/geoserver/gis/wms',
    params: { 'LAYERS': 'gis:buildings', 'TILED': true, 'TRANSPARENT': true },
    serverType: 'geoserver'
  }),
  opacity: 0.6
});

const roadsLayer = new ImageLayer({
  source: new ImageWMS({
    url: 'http://localhost:8080/geoserver/gis/wms',
    params: { 'LAYERS': 'gis:roads', 'TILED': true, 'TRANSPARENT': true },
    serverType: 'geoserver'
  }),
  opacity: 0.7
});

const poisLayer = new ImageLayer({
  source: new ImageWMS({
    url: 'http://localhost:8080/geoserver/gis/wms',
    params: { 'LAYERS': 'gis:pois', 'TILED': true, 'TRANSPARENT': true },
    serverType: 'geoserver'
  })
});

// Карта
const map = new Map({
  target: 'map',
  layers: [baseLayer, buildingsLayer, roadsLayer, poisLayer],
  view: new View({
    center: [5605847, 7045434],
    zoom: 16
  })
});

// Слой Overture с Mapbox Style
const overtureLayer = new VectorLayer({
  source: new VectorSource({
    url: './overture.geojson',
    format: new GeoJSON()
  })
});

// Загружаем стиль из отдельного файла
fetch('./overture-style.json')
  .then(res => res.json())
  .then(style => {
    applyStyle(overtureLayer, style);
    map.addLayer(overtureLayer);
  });

// Клик
map.on('singleclick', (evt) => {
  const feature = map.forEachFeatureAtPixel(evt.pixel, f => f);
  if (feature) {
    const props = feature.getProperties();
    
    let html = '<div style="font-family: monospace; max-width: 400px;">';
    html += '<h3>Информация об объекте</h3><hr>';
    
    for (const [key, value] of Object.entries(props)) {
      if (key === 'geometry' || typeof value === 'function') continue;
      let val = (value === undefined || value === null) ? '—' : value;
      if (typeof val === 'object') val = JSON.stringify(val);
      html += `<b>${key}:</b> ${val}<br>`;
    }
    
    html += '</div>';
    
    const div = document.createElement('div');
    div.innerHTML = html;
    div.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 1000;
      max-width: 90%;
      max-height: 80%;
      overflow: auto;
    `;
    
    document.body.appendChild(div);
    
    setTimeout(() => {
      div.addEventListener('click', () => div.remove());
    }, 100);
  }
});
