INSTALL spatial;
LOAD spatial;

CREATE TABLE osm_data AS
SELECT * FROM ST_Read('lab2/input.geojson')
WHERE ST_IsValid(geom);

CREATE TABLE osm_data_fixed AS
SELECT 
    id, user,
    ST_MakeValid(geom) AS geom
FROM osm_data
WHERE ST_IsValid(ST_MakeValid(geom));

CREATE TEMP TABLE my_area AS
SELECT ST_Union_Agg(geom) AS geom FROM osm_data_fixed WHERE user = 'PolinaKarpacheva';

CREATE TABLE overture_data AS
SELECT
    row_number() OVER () AS id,
    ST_MakeEnvelope(
        ST_X(ST_Centroid(geom)) - 0.0001,
        ST_Y(ST_Centroid(geom)) - 0.0001,
        ST_X(ST_Centroid(geom)) + 0.0001,
        ST_Y(ST_Centroid(geom)) + 0.0001
    ) AS geometry,
    CASE 
        WHEN user = 'PolinaKarpacheva' THEN 'my'
        ELSE 'osm'
    END AS source_type
FROM osm_data_fixed
WHERE ST_Intersects(geom, (SELECT geom FROM my_area));

WITH to_ml AS (
    SELECT id
    FROM overture_data
    WHERE source_type = 'osm'
    ORDER BY random()
    LIMIT (SELECT COUNT(*) * 0.3 FROM overture_data WHERE source_type = 'osm')
)
UPDATE overture_data
SET source_type = 'ml'
FROM to_ml
WHERE overture_data.id = to_ml.id;

COPY (
    SELECT json_object(
        'type', 'FeatureCollection',
        'features', json_group_array(
            json_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(ST_SetCRS(geometry, 'EPSG:4326'))::JSON,
                'properties', json_object('id', id, 'source_type', source_type)
            )
        )
    )
    FROM overture_data
) TO 'lab2/client/public/overture.geojson'
WITH (FORMAT CSV, HEADER false, QUOTE '');

SELECT source_type, COUNT(*) FROM overture_data GROUP BY source_type;