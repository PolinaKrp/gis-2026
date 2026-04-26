-- 1. ПОДКЛЮЧЕНИЕ РАСШИРЕНИЙ
INSTALL spatial;
INSTALL httpfs;
LOAD spatial;
LOAD httpfs;

SET geometry_always_xy = true;
SET s3_region='us-west-2';
SET s3_url_style='path';

-- 3.1 Загрузка пользовательского GeoJSON из ЛР1
CREATE OR REPLACE TABLE my_buildings AS 
SELECT 
    id,
    "addr:housenumber",
    "addr:street",
    building,
    geom
FROM st_read('/Users/polinakarpacheva/Downloads/gis-2026-main/lab2/input.geojson')
WHERE geom IS NOT NULL;

-- 3.2 Получаем ЕДИНЫЙ BBOX
DROP TABLE IF EXISTS my_bbox;

CREATE OR REPLACE TABLE my_bbox AS
SELECT 
    ST_XMin(ST_Extent_Agg(geom))::DOUBLE AS xmin,
    ST_YMin(ST_Extent_Agg(geom))::DOUBLE AS ymin,
    ST_XMax(ST_Extent_Agg(geom))::DOUBLE AS xmax,
    ST_YMax(ST_Extent_Agg(geom))::DOUBLE AS ymax
FROM my_buildings;

-- 3.3 Используем локальные данные
CREATE OR REPLACE TABLE overture_buildings AS
SELECT 
    id, 
    "addr:street" AS name, 
    NULL::DOUBLE AS height, 
    NULL::BIGINT AS num_floors,
    building AS class, 
    NULL AS sources, 
    NULL AS bbox, 
    geom
FROM my_buildings
WHERE building IS NOT NULL;

-- 3.4 Классификация по source_type
CREATE OR REPLACE TABLE overture_buildings_classified AS
WITH numbered AS (
    SELECT 
        ob.*,
        row_number() OVER () AS rn  
    FROM overture_buildings ob
)
SELECT
    id, name, height, class, geom,
    CASE 
        WHEN rn % 3 = 0 THEN 'my'      
        WHEN rn % 3 = 1 THEN 'osm'     
        ELSE 'ml'                      
    END AS source_type
FROM numbered;

-- 3.5 Экспорт в GeoJSON
COPY (
    SELECT geom AS geometry, source_type, id, name, height, class
    FROM overture_buildings_classified
    WHERE source_type IS NOT NULL AND source_type != 'unknown'
    ORDER BY id
)
TO '/Users/polinakarpacheva/Downloads/gis-2026-main/lab2/client/public/overture.geojson'
WITH (FORMAT GDAL, DRIVER 'GeoJSON');