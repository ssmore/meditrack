CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    user_credential VARCHAR(8) UNIQUE NOT NULL
);

CREATE TABLE medicines (
    id SERIAL PRIMARY KEY,
    medicine_name VARCHAR(255) NOT NULL,
    measurement_type VARCHAR(20) NOT NULL,
    quantity FLOAT,
    date_of_entry TIMESTAMP DEFAULT NOW(),
    date_of_update TIMESTAMP DEFAULT NOW(),
    date_of_expiry TIMESTAMP,
    description VARCHAR(255),
    user_credential VARCHAR(8) REFERENCES users(user_credential)
);


CREATE FUNCTION generate_random_hash() RETURNS TRIGGER AS $$
DECLARE
    hash_value TEXT;
BEGIN
    NEW.user_credential := substring(md5(random()::text || clock_timestamp()::text)::text from 1 for 8);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER generate_credential
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE PROCEDURE generate_random_hash();

