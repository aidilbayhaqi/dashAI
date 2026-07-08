import asyncio

from src.seeds.seed import (
    run_all_seeds,
)


if __name__ == "__main__":
    asyncio.run(
        run_all_seeds()
    )