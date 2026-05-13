from app.database import execute


DEFAULT_BANKS = (
    ("ING", "/static/vendor/banks/ing.svg"),
    ("Santander", "/static/vendor/banks/santander.svg"),
    ("BBVA", "/static/vendor/banks/bbva.svg"),
    ("CaixaBank", "/static/vendor/banks/caixabank.svg"),
    ("Banco Sabadell", "/static/vendor/banks/sabadell.svg"),
    ("Bankinter", "/static/vendor/banks/bankinter.svg"),
    ("Openbank", "/static/vendor/banks/openbank.svg"),
    ("Revolut", "/static/vendor/banks/revolut.svg"),
    ("N26", "/static/vendor/banks/n26.svg"),
    ("Unicaja", "/static/vendor/banks/unicaja.svg"),
)


def run_migrations() -> None:
    execute(
        """
        CREATE TABLE IF NOT EXISTS movimientos (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            pendiente_id VARCHAR(80) DEFAULT NULL,
            telegram_user_id BIGINT NULL,
            chat_id BIGINT NULL,
            tipo VARCHAR(30) NOT NULL,
            cantidad DECIMAL(12,2) NOT NULL,
            moneda VARCHAR(10) NOT NULL DEFAULT 'EUR',
            categoria VARCHAR(100) DEFAULT NULL,
            subcategoria VARCHAR(100) DEFAULT NULL,
            concepto VARCHAR(255) DEFAULT NULL,
            metodo_pago VARCHAR(100) DEFAULT NULL,
            cuenta VARCHAR(100) DEFAULT NULL,
            nota TEXT DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_pendiente_id (pendiente_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )
    execute("ALTER TABLE movimientos MODIFY telegram_user_id BIGINT NULL")
    execute("ALTER TABLE movimientos MODIFY chat_id BIGINT NULL")
    execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            username VARCHAR(120) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )
    execute(
        """
        CREATE TABLE IF NOT EXISTS app_settings (
            setting_key VARCHAR(120) NOT NULL,
            setting_value TEXT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (setting_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )
    execute(
        """
        CREATE TABLE IF NOT EXISTS banks (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(120) NOT NULL,
            logo_url VARCHAR(500) DEFAULT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_bank_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )
    execute(
        """
        INSERT IGNORE INTO banks (name)
        SELECT DISTINCT cuenta
        FROM movimientos
        WHERE cuenta IS NOT NULL AND cuenta <> ''
        """
    )
    for name, logo_url in DEFAULT_BANKS:
        execute(
            """
            INSERT INTO banks (name, logo_url)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE
                logo_url = COALESCE(logo_url, VALUES(logo_url)),
                is_active = TRUE
            """,
            (name, logo_url),
        )
    execute(
        """
        CREATE TABLE IF NOT EXISTS import_jobs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            filename VARCHAR(255) NOT NULL,
            imported_rows INT NOT NULL DEFAULT 0,
            skipped_rows INT NOT NULL DEFAULT 0,
            errors_json JSON NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )
    execute(
        """
        CREATE TABLE IF NOT EXISTS telegram_messages (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            update_id BIGINT NOT NULL,
            message_id BIGINT NULL,
            chat_id BIGINT NULL,
            telegram_user_id BIGINT NULL,
            text TEXT NULL,
            movement_id BIGINT UNSIGNED NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_update_id (update_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )
