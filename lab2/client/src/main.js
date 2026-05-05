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

const baseLayer = new TileLayer({
  source: new XYZ({
    url: 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attributions: '© OpenStreetMap contributors, © CartoDB'
  })
});

const wmsUrl = 'http://localhost:8080/geoserver/gis/wms';

const lab2Buildings = new ImageLayer({
  source: new ImageWMS({
    url: wmsUrl,
    params: { LAYERS: 'gis:buildings', TILED: true, TRANSPARENT: true },
    serverType: 'geoserver'
  }),
  opacity: 0.6
});

const lab2Roads = new ImageLayer({
  source: new ImageWMS({
    url: wmsUrl,
    params: { LAYERS: 'gis:roads', TILED: true, TRANSPARENT: true },
    serverType: 'geoserver'
  }),
  opacity: 0.7
});

const lab2Pois = new ImageLayer({
  source: new ImageWMS({
    url: wmsUrl,
    params: { LAYERS: 'gis:pois', TILED: true, TRANSPARENT: true },
    serverType: 'geoserver'
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
  layers: [baseLayer, lab2Roads, lab2Buildings, lab2Pois, overtureLayer],
  view: new View({
    center: [5605382, 7036821],
    zoom: 14
  })
});

fetch('./overture-style.json')
  .then(res => res.json())
  .then(style => applyStyle(overtureLayer, style))
  .catch(console.error);

map.on('singleclick', function (evt) {
  const feature = map.forEachFeatureAtPixel(evt.pixel, f => f);
  if (!feature) return;

  const props = feature.getProperties();
  const div = document.createElement('div');
  div.innerHTML = `
    <div style="font-family: monospace; max-width: 300px;">
      <h3>Объект Overture</h3>
      <b>Источник:</b> ${props.source_type?.toUpperCase() || '—'}<br>
      <b>ID:</b> ${props.id || '—'}<br>
      <b>Класс:</b> ${props.class || '—'}<br>
      <b>Подтип:</b> ${props.subtype || '—'}<br>
      <b>Высота:</b> ${props.height ?? '—'}
    </div>`;
  div.style.cssText = `
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: white; padding: 20px; border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 1000; border-left: 6px solid #4caf50;
  `;
  document.body.appendChild(div);
  setTimeout(() => div.addEventListener('click', () => div.remove()), 100);
});
