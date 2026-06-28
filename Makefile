# Local dev for the Suzi waitlist backend.
# Postgres runs in Docker on host port 5434 (5432/5433 are taken locally).

.PHONY: db-up db-down db-reset db-logs db-psql dev test

db-up:        ## Start local Postgres (detached)
	docker compose up -d

db-down:      ## Stop local Postgres
	docker compose down

db-reset:     ## Wipe the DB volume and recreate from db/schema.sql
	docker compose down -v
	docker compose up -d

db-logs:      ## Tail Postgres logs
	docker compose logs -f db

db-psql:      ## Open a psql shell in the local DB
	docker compose exec db psql -U suzi -d suzi

dev:          ## Run the site + /api locally (needs: npm i -g vercel)
	vercel dev

test:         ## Run unit tests
	node --test
