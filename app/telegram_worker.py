from app.migrations import run_migrations
from app.telegram_bot import run_polling


if __name__ == "__main__":
    run_migrations()
    run_polling()
