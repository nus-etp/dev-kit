# Resolve the Docker socket automatically so vitest's testcontainers can find a
# runtime regardless of setup (Colima, Docker Desktop, etc.). Override by
# exporting DOCKER_HOST yourself before running make.
DOCKER_HOST ?= $(shell docker context inspect -f '{{.Endpoints.docker.Host}}' 2>/dev/null)

.PHONY: test

test: ## Run the apps/web vitest suite (testcontainers).
	DOCKER_HOST="$(DOCKER_HOST)" \
	TESTCONTAINERS_RYUK_DISABLED=true \
	CI=true \
	pnpm --filter @acme/web exec vitest run
