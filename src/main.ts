import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { VALIDATION_PIPE_OPTIONS } from "./common/pipes/validation-pipe.options";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
  app.useGlobalInterceptors(new LoggingInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
