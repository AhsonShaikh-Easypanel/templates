import {
  Output,
  randomPassword,
  randomString,
  Services,
} from "~templates-utils";
import { Input } from "./meta";

export function generate(input: Input): Output {
  const services: Services = [];
  const name = input.appServiceName;
  const databasePassword = randomPassword();
  const appUrl = `https://$(PROJECT_NAME)-${name}.$(EASYPANEL_HOST)`;

  services.push({
    type: "app",
    data: {
      serviceName: name,
      source: { type: "image", image: input.frontendServiceImage },
      env: `BACKEND_URL=http://$(PROJECT_NAME)_${name}-backend:3001`,
      domains: [{ host: "$(EASYPANEL_DOMAIN)", port: 80 }],
    },
  });

  services.push({
    type: "app",
    data: {
      serviceName: `${name}-backend`,
      source: { type: "image", image: input.backendServiceImage },
      env: [
        `NODE_ENV=production`,
        `PORT=3001`,
        `DATABASE_URL=postgres://postgres:${databasePassword}@$(PROJECT_NAME)_${name}-db:5432/$(PROJECT_NAME)`,
        `JWT_SECRET=${randomString(48)}`,
        `ENCRYPTION_KEY=${randomString(48)}`,
        `CORS_ORIGIN=${appUrl}`,
        // Easypanel's proxy + the frontend's nginx
        `TRUST_PROXY_HOPS=2`,
        `TRASH_RETENTION_DAYS=30`,
      ].join("\n"),
    },
  });

  services.push({
    type: "postgres",
    data: {
      serviceName: `${name}-db`,
      image: "postgres:16.15-alpine",
      password: databasePassword,
    },
  });

  if (input.bundledStorage) {
    services.push({
      type: "app",
      data: {
        serviceName: `${name}-storage`,
        source: { type: "image", image: "chrislusf/seaweedfs:4.48" },
        env: [
          `AWS_ACCESS_KEY_ID=yourdrive`,
          `AWS_SECRET_ACCESS_KEY=${randomString(40)}`,
        ].join("\n"),
        deploy: {
          command:
            "/entrypoint.sh mini -dir=/data -s3.port=9000 -bucket=yourdrive -master.telemetry=false -admin.ui=false",
        },
        domains: [{ host: "$(EASYPANEL_DOMAIN)", port: 9000 }],
        mounts: [{ type: "volume", name: "data", mountPath: "/data" }],
      },
    });
  }

  return { services };
}
