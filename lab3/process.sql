INSTALL spatial;
INSTALL httpfs;
LOAD spatial;
LOAD httpfs;

CREATE TABLE osm_data AS
SELECT * FROM ST_Read('lab2/input.geojson');

CREATE TABLE links AS
    WITH raw_data AS (
        SELECT *
        FROM 'https://stac.overturemaps.org/2026-04-15.0/buildings/building/collection.json'
    ),
    raw_links AS (
        SELECT unnest(links) AS link
        FROM raw_data
    ),
    links AS (
        SELECT row_number() OVER () id, link.href
        FROM raw_links
        WHERE link.type = 'application/geo+json'
    ),
    raw_bboxes AS (
        SELECT unnest(extent.spatial.bbox) bbox
        FROM raw_data
    ),
    bboxes AS (
        SELECT row_number() OVER () id, bbox[1] xmin, bbox[2] ymin, bbox[3] xmax, bbox[4] ymax
        FROM raw_bboxes
    )
    SELECT href, xmin, ymin, xmax, ymax
    FROM links
    JOIN bboxes ON links.id = bboxes.id;

SET VARIABLE item_url = (
    SELECT DISTINCT
        'https://stac.overturemaps.org/2026-04-15.0/buildings/building/' || links.href
    FROM links
    JOIN osm_data
        ON ST_Xmin(geom) BETWEEN links.xmin AND links.xmax
        AND ST_Ymin(geom) BETWEEN links.ymin AND links.ymax
    LIMIT 1
);

SET VARIABLE s3_href = (
    SELECT assets.aws.alternate.s3.href
    FROM read_json(getvariable('item_url'))
);

CREATE TABLE overture_data AS
WITH osm_data_geom_bbox AS (
    SELECT ST_Extent_Agg(geom) geom
    FROM osm_data
),
osm_data_bbox AS (
    SELECT ST_Xmin(geom) AS xmin,
           ST_Ymin(geom) AS ymin,
           ST_Xmax(geom) AS xmax,
           ST_Ymax(geom) AS ymax
    FROM osm_data_geom_bbox
)
SELECT * EXCLUDE geometry, geometry
FROM read_parquet(getvariable('s3_href')) data
JOIN osm_data_bbox
    ON ST_Xmin(geometry) BETWEEN osm_data_bbox.xmin AND osm_data_bbox.xmax
    AND ST_Ymin(geometry) BETWEEN osm_data_bbox.ymin AND osm_data_bbox.ymax
WHERE try(ST_IsValid(geometry)) = true;

ALTER TABLE overture_data ADD COLUMN source_type VARCHAR;

UPDATE overture_data 
SET source_type = 
    CASE
        WHEN EXISTS (
            SELECT 1 FROM osm_data o 
            WHERE o.user = 'PolinaKarpacheva'  
              AND ST_Intersects(ST_SetCRS(overture_data.geometry, 'EPSG:4326'), o.geom)
        ) THEN 'my'
        WHEN list_contains(list_transform(overture_data.sources, s -> s.dataset), 'OpenStreetMap') THEN 'osm'
        ELSE 'ml'
    END;

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