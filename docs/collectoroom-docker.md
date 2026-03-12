**Collectoroom Docker Stack**

- File: [docker-compose.collectoroom.yml](docker-compose.collectoroom.yml)
- Env: [`.env.collectoroom`](.env.collectoroom)

Quick steps to run the stack (from repo root):

```bash
# start the Collectoroom stack (project name Collectoroom)
docker compose -p Collectoroom --env-file .env.collectoroom -f docker-compose.collectoroom.yml up -d

# view logs
docker compose -p Collectoroom -f docker-compose.collectoroom.yml logs -f

# stop and remove containers (keep volumes)
docker compose -p Collectoroom -f docker-compose.collectoroom.yml down

# stop and remove containers + volumes
docker compose -p Collectoroom -f docker-compose.collectoroom.yml down -v
```

Notes:
- The stack uses non-default ports in `.env.collectoroom` so it should not clash with other projects.
- To connect Prisma / app, set `DATABASE_URL` to:

```
postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}
```

- For S3-compatible storage (MinIO) configure your S3 client to use:

```
endpoint: http://localhost:${MINIO_PORT}
accessKeyId: ${MINIO_ROOT_USER}
secretAccessKey: ${MINIO_ROOT_PASSWORD}
forcePathStyle: true
```
