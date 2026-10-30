CREATE TABLE autorender_overrides (
  demo_id UUID PRIMARY KEY REFERENCES demos(id)
);
