-- Insert a test user
INSERT INTO users (id, email, name, plan)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'demo@example.com', 'Demo User', 'premium')
ON CONFLICT (id) DO NOTHING;
