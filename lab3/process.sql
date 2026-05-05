
INSTALL spatial;
INSTALL httpfs;
LOAD spatial;
LOAD httpfs;

DROP TABLE IF EXISTS osm_data;
CREATE TABLE osm_data AS
SELECT *
FROM ST_Read('../lab1.geojson')
WHERE building IS NOT NULL
  AND user = 'PolinaKarpacheva'
  AND ST_IsValid(geom);

DROP TABLE IF EXISTS links;
CREATE TABLE links AS
WITH raw_data AS (
    SELECT *
    FROM 'https://stac.overturemaps.org/2026-04-15.0/buildings/building/collection.json'
),
raw_links AS (
    SELECT unnest(links) AS link
    FROM raw_data
),
items AS (
    SELECT row_number() OVER () AS id, link.href
    FROM raw_links
    WHERE link.type = 'application/geo+json'
),
raw_bboxes AS (
    SELECT unnest(extent.spatial.bbox) AS bbox
    FROM raw_data
),
bboxes AS (
    SELECT row_number() OVER () AS id,
           bbox[1] AS xmin, bbox[2] AS ymin,
           bbox[3] AS xmax, bbox[4] AS ymax
    FROM raw_bboxes
)
SELECT items.href, bboxes.xmin, bboxes.ymin, bboxes.xmax, bboxes.ymax
FROM items
JOIN bboxes ON items.id = bboxes.id;

DROP TABLE IF EXISTS osm_bbox;
CREATE TABLE osm_bbox AS
SELECT ST_XMin(e) - 0.001 AS xmin,
       ST_YMin(e) - 0.001 AS ymin,
       ST_XMax(e) + 0.001 AS xmax,
       ST_YMax(e) + 0.001 AS ymax
FROM (SELECT ST_Extent_Agg(geom) AS e FROM osm_data);

SET VARIABLE item_url = (
    SELECT 'https://stac.overturemaps.org/2026-04-15.0/buildings/building/' || links.href
    FROM links, osm_bbox
    WHERE osm_bbox.xmin BETWEEN links.xmin AND links.xmax
      AND osm_bbox.ymin BETWEEN links.ymin AND links.ymax
    LIMIT 1
);

SET VARIABLE s3_href = (
    SELECT assets.aws.alternate.s3.href
    FROM read_json(getvariable('item_url'))
);

DROP TABLE IF EXISTS overture_buildings;
CREATE TABLE overture_buildings AS
SELECT data.* EXCLUDE geometry, data.geometry
FROM read_parquet(getvariable('s3_href')) data, osm_bbox
WHERE data.bbox.xmin <= osm_bbox.xmax
  AND data.bbox.xmax >= osm_bbox.xmin
  AND data.bbox.ymin <= osm_bbox.ymax
  AND data.bbox.ymax >= osm_bbox.ymin
  AND try(ST_IsValid(data.geometry)) = TRUE;

COPY (
    SELECT json_object(
        'type', 'FeatureCollection',
        'features', json_group_array(
            json_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(ST_SetCRS(geometry, 'EPSG:4326'))::JSON,
                'properties', json_object(
                    'id', id,
                    'source_type', source_type,
                    'class', class,
                    'subtype', subtype,
                    'height', height
                )
            )
        )
    )
    FROM (
        SELECT DISTINCT ON (ob.id)
            ob.id,
            ob.geometry,
            ob.class,
            ob.subtype,
            ob.height,
            CASE
                WHEN osm.geom IS NOT NULL THEN 'my'
                WHEN list_contains(
                        list_transform(ob.sources, s -> s.dataset),
                        'OpenStreetMap'
                    ) THEN 'osm'
                ELSE 'ml'
            END AS source_type
        FROM overture_buildings ob
        LEFT JOIN osm_data osm
            ON try(ST_Intersects(osm.geom, ST_SetCRS(ob.geometry, 'EPSG:4326'))) = TRUE
    )
)
TO '../lab2/client/public/overture.geojson'
WITH (FORMAT CSV, HEADER false, QUOTE '');

SELECT source_type, COUNT(*) AS cnt
FROM (
    SELECT DISTINCT ON (ob.id)
        ob.id,
        CASE
            WHEN osm.geom IS NOT NULL THEN 'my'
            WHEN list_contains(
                    list_transform(ob.sources, s -> s.dataset),
                    'OpenStreetMap'
                ) THEN 'osm'
            ELSE 'ml'
        END AS source_type
    FROM overture_buildings ob
    LEFT JOIN osm_data osm
        ON try(ST_Intersects(osm.geom, ST_SetCRS(ob.geometry, 'EPSG:4326'))) = TRUE
)
GROUP BY source_type
ORDER BY source_type;
