-- admin 계정 시드 (비밀번호: admin123)
INSERT OR IGNORE INTO users (username, email, password, role) 
VALUES ('admin', 'admin@aeroc.com', '$2a$10$hpDPHsfiBD0sZgbMfWd/x.kTjEc5Rgrj93r398BxTkT2wyZOhcomS', 'admin');
