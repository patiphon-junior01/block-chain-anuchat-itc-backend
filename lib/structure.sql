CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  firstname VARCHAR(20) NOT NULL,
  lastname VARCHAR(20) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE wallet (
  id SERIAL PRIMARY KEY,
  id_user int NOT NULL,
  name_wallet VARCHAR(20) NOT NULL,
  eth_address VARCHAR(42) UNIQUE NOT NULL,
  eth_private_key VARCHAR(66) NOT NULL,
  CONSTRAINT fk_user FOREIGN KEY (id_user) REFERENCES users(id) ON DELETE CASCADE
);
