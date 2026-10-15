ALTER TABLE records_mp
    ADD COLUMN host_autorender_id TEXT,
    ADD COLUMN partner_autorender_id TEXT;

UPDATE records_mp
SET host_autorender_id = autorender_id
WHERE autorender_id IS NOT NULL;

ALTER TABLE records_mp
    DROP COLUMN autorender_id;
