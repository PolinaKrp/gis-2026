import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { applyStyle } from 'ol-mapbox-style';

const baseLayer = new TileLayer({
  source: new XYZ({
    url: 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attributions: '© OpenStreetMap contributors, © CartoDB'
  })
});

const overtureLayer = new VectorLayer({
  source: new VectorSource({
    url: './overture.geojson',
    format: new GeoJSON()
  })
});

const map = new Map({
  target: 'map',
  layers: [baseLayer, overtureLayer],
  view: new View({
    center: [5605847, 7045434], 
    zoom: 14
  })
});

fetch('./overture-style.json')
  .then(res => res.json())
  .then(style => applyStyle(overtureLayer, style))
  .catch(console.error);

// Информация по клику
map.on('singleclick', function(evt) {
  const feature = map.forEachFeatureAtPixel(evt.pixel, function(f) {
    return f;
  });
  
  if (feature) {
    const props = feature.getProperties();
    let info = '<div style="font-family: monospace; max-width: 300px;">';
    info += '<h3>Объект</h3>';
    info += `<b>Тип:</b> ${props.source_type?.toUpperCase() || 'неизвестно'}<br>`;
    info += `<b>ID:</b> ${props.id || '—'}<br>`;
    info += '</div>';
    
    const div = document.createElement('div');
    div.innerHTML = info;
    div.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 1000;
      border-left: 6px solid #4caf50;
    `;
    document.body.appendChild(div);
    
    setTimeout(() => div.addEventListener('click', () => div.remove()), 100);
  }
});

// Для отладки: выводим количество загруженных объектов
overtureLayer.getSource().once('featuresloadend', () => {
  console.log('Загружено объектов:', overtureLayer.getSource().getFeatures().length);
});