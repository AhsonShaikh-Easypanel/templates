import {
  Output,
  randomPassword,
  randomString,
  Services,
} from "~templates-utils";
import { Input } from "./meta";

export function generate(input: Input): Output {
  const services: Services = [];

  const postgresPassword = randomPassword();
  const redisPassword = randomPassword();
  const minioPassword = randomPassword();
  const nextAuthSecret = randomString(32);

  services.push({
    type: "postgres",
    data: {
      serviceName: `${input.appServiceName}-db`,
      password: postgresPassword,
    },
  });

  services.push({
    type: "redis",
    data: {
      serviceName: `${input.appServiceName}-redis`,
      password: redisPassword,
    },
  });

  services.push({
    type: "app",
    data: {
      serviceName: `${input.appServiceName}-storage`,
      source: {
        type: "image",
        image: "chrislusf/seaweedfs:4.48",
      },
      env: [
        `AWS_ACCESS_KEY_ID=unsend`,
        `AWS_SECRET_ACCESS_KEY=${minioPassword}`,
      ].join("\n"),
      deploy: {
        command:
          "/entrypoint.sh mini -dir=/data -s3.port=9000 -bucket=unsend -master.telemetry=false -admin.ui=false",
      },
      domains: [
        {
          host: "$(EASYPANEL_DOMAIN)",
          port: 9000,
        },
      ],
      mounts: [
        {
          type: "volume",
          name: "storage",
          mountPath: "/data",
        },
      ],
    },
  });

  services.push({
    type: "app",
    data: {
      serviceName: input.appServiceName,
      source: {
        type: "image",
        image: input.appServiceImage,
      },
      env: [
        `PORT=3000`,
        `DATABASE_URL=postgresql://postgres:${postgresPassword}@$(PROJECT_NAME)_${input.appServiceName}-db:5432/$(PROJECT_NAME)`,
        `NEXTAUTH_URL=https://$(PRIMARY_DOMAIN)`,
        `NEXTAUTH_SECRET=${nextAuthSecret}`,
        `AWS_ACCESS_KEY=unsend`,
        `AWS_SECRET_KEY=${minioPassword}`,
        `AWS_ENDPOINT_URL=http://$(PROJECT_NAME)_${input.appServiceName}-storage:9000`,
        `AWS_DEFAULT_REGION=us-east-1`,
        `GITHUB_ID=${input.githubId}`,
        `GITHUB_SECRET=${input.githubSecret}`,
        `REDIS_URL=redis://:${redisPassword}@$(PROJECT_NAME)_${input.appServiceName}-redis:6379`,
        `NEXT_PUBLIC_IS_CLOUD=false`,
        `API_RATE_LIMIT=${input.apiRateLimit || "60"}`,
      ].join("\n"),
      domains: [
        {
          host: "$(EASYPANEL_DOMAIN)",
          port: 3000,
        },
      ],
    },
  });

  return { services };
}
