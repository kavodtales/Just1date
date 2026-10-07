FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN npm ci --workspace=@just1date/api --include-workspace-root && npm run build -w @just1date/api

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/admin/package.json ./apps/admin/package.json
COPY --from=build /app/apps/mobile/package.json ./apps/mobile/package.json
COPY --from=build /app/packages ./packages
RUN npm ci --omit=dev --workspace=@just1date/api --include-workspace-root --ignore-scripts
COPY --from=build /app/apps/api/dist ./apps/api/dist
USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
