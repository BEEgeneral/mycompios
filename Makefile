# MyCompi Development Commands
# Use: make [command]

.PHONY: help dev build test deploy clean

# Development
dev:
	npm run dev

# Build
build:
	npx next build

# Tests
test:
	npx vitest

test:watch:
	npx vitest watch

test:coverage:
	npx vitest --coverage

# Deploy
deploy:
	git push origin main

deploy:vercel:
	npx vercel --prod

# Clean
clean:
	rm -rf .next
	rm -rf coverage
	rm -rf node_modules/.cache

# Database
db:migrate:
	npx tsx scripts/migrate.ts

db:studio:
	npx prisma studio

# VPS Commands (requires SSH key configured)
vps:ssh:
	ssh -i ~/.ssh/id_ed25519 root@187.127.70.123

vps:logs:
	ssh -i ~/.ssh/id_ed25519 root@187.127.70.123 "tail -50 /var/log/celery_worker.log"

vps:restart-celery:
	ssh -i ~/.ssh/id_ed25519 root@187.127.70.123 "pkill -f 'celery.*worker'; cd /opt/mycompi-celery && nohup python3 -m celery -A celery_worker worker --loglevel=info -c 4 >> /var/log/celery_worker.log 2>&1 &"

vps:status:
	ssh -i ~/.ssh/id_ed25519 root@187.127.70.123 "ps aux | grep -E 'celery|ollama|redis|chroma' | grep -v grep"

# Health checks
health:api
	curl -s https://www.mycompi.com/api/health-check

health:backend
	curl -s -X POST https://guuimyx3.functions.insforge.app/autonomous -H "Content-Type: application/json" -d '{"action":"status"}'

health:vps
	@echo "Checking VPS services..."
	@ssh -i ~/.ssh/id_ed25519 root@187.127.70.123 "pgrep -a ollama && echo 'Ollama: OK' || echo 'Ollama: DOWN'"
	@ssh -i ~/.ssh/id_ed25519 root@187.127.70.123 "pgrep -a redis && echo 'Redis: OK' || echo 'Redis: DOWN'"
	@ssh -i ~/.ssh/id_ed25519 root@187.127.70.123 "pgrep -a celery && echo 'Celery: OK' || echo 'Celery: DOWN'"

# Lint
lint:
	npx next lint
	npx tsc --noEmit

# Format
format:
	npx prettier --write .
	npx eslint --fix .

.DEFAULT_GOAL := help
help:
	@echo "MyCompi Development Commands"
	@echo "============================"
	@echo "make dev              - Start development server"
	@echo "make build            - Build for production"
	@echo "make test            - Run tests"
	@echo "make deploy          - Push and trigger Vercel deploy"
	@echo "make vps:status       - Check VPS services status"
	@echo "make health:vps       - Health check all VPS services"