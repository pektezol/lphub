ALTER TABLE records_sp ADD COLUMN autorender_id TEXT;
ALTER TABLE records_mp ADD COLUMN autorender_id TEXT;

CREATE OR REPLACE FUNCTION log_audit() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit (table_name, operation_type, old_data, new_data, changed_by)
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        NULLIF(current_setting('app.user_id', true), '')::TEXT
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
