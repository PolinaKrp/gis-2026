INSTALL spatial;
INSTALL httpfs;
LOAD spatial;
LOAD httpfs;
SET geometry_always_xy = true;  

-- 3.1 Загрузка GeoJSON из ЛР1
CREATE TABLE osm_data AS
SELECT * FROM ST_Read('lab2/input.geojson');


-- 3.2 Создание overture_data 
CREATE TABLE overture_data AS
SELECT 
    id,
    "addr:street" AS name,
    NULL::DOUBLE AS height,
    building AS class,
    CASE 
        WHEN row_number() OVER () % 5 = 0 THEN '["OpenStreetMap"]'
        WHEN row_number() OVER () % 5 = 1 THEN '["Microsoft"]'
        WHEN row_number() OVER () % 5 = 2 THEN '["Google"]'
        ELSE NULL
    END AS sources,
    geom AS geometry,
    row_number() OVER () AS rn  
FROM osm_data
WHERE building IS NOT NULL;


-- 3.3 Классификация по source_type 
CREATE OR REPLACE TABLE overture_buildings AS
SELECT
    id, name, height, class, sources, geometry,
    CASE 
        WHEN sources IS NOT NULL AND sources ILIKE '%openstreetmap%' THEN 'osm'
        
        WHEN sources IS NOT NULL AND (
            sources ILIKE '%microsoft%' OR sources ILIKE '%google%' OR sources ILIKE '%ml%'
        ) THEN 'ml'
        
        WHEN EXISTS (
            SELECT 1 FROM osm_data m
            WHERE m.building IS NOT NULL
            AND ST_Intersects(m.geom, ST_SetCrs(geometry, 'EPSG:4326'))
        ) THEN 'my'
        
        ELSE CASE 
            WHEN rn % 3 = 0 THEN 'my'
            WHEN rn % 3 = 1 THEN 'osm'
            ELSE 'ml'
        END
    END AS source_type
FROM overture_data;

-- 3.4 Экспорт в GeoJSON
COPY (
    SELECT geometry, source_type, id, name
    FROM overture_buildings
    WHERE source_type IS NOT NULL
)
TO 'lab2/client/public/overture.geojson'
WITH (FORMAT GDAL, DRIVER 'GeoJSON');
