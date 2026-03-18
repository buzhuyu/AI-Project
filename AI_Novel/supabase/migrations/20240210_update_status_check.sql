
ALTER TABLE chapters DROP CONSTRAINT IF EXISTS chapters_status_check;

ALTER TABLE chapters ADD CONSTRAINT chapters_status_check CHECK (
    status IN (
        'pending', 
        'writing', 
        'proofreading', 
        'reviewing_agents', 
        'editing', 
        'reading', 
        'reviewing', 
        'completed'
    )
);
